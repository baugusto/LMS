#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# shellcheck source=./helpers.sh
source "$SCRIPT_DIR/helpers.sh"

ENV_FILE="$ROOT_DIR/.env.production"
if [ ! -f "$ENV_FILE" ]; then
  ENV_FILE="$ROOT_DIR/.env"
fi

load_env "$ENV_FILE"

DO_BUILD="true"
DO_PUSH="true"
DO_DEPLOY="true"

for arg in "$@"; do
  case "$arg" in
    --push-only)
      DO_DEPLOY="false"
      ;;
    --deploy-only)
      DO_BUILD="false"
      DO_PUSH="false"
      ;;
    --help|-h)
      echo "Usage: $0 [--push-only] [--deploy-only]"
      exit 0
      ;;
    *)
      die "Unknown argument: $arg"
      ;;
  esac
done

if [ "$DO_DEPLOY" = "true" ]; then
  if [ -d "$ROOT_DIR/.git" ]; then
    require_cmd git
    log "Updating repository (git pull --ff-only)"
    git -C "$ROOT_DIR" pull --ff-only
  else
    warn "No .git directory found at $ROOT_DIR; skipping git pull"
  fi
fi

required_vars=(DOCKERHUB_USER IMAGE_NAME STACK_NAME DOMAIN)
for var in "${required_vars[@]}"; do
  if [ -z "${!var:-}" ]; then
    die "Missing required env var: $var (from $ENV_FILE)"
  fi
done

: "${TRAEFIK_PUBLIC_NETWORK:=traefik-public}"
: "${TRAEFIK_CERTRESOLVER:=letsencrypt}"
: "${PORT:=3000}"
: "${NODE_ENV:=production}"
if [ -z "${STACK_FILE:-}" ]; then
  if [ -f "$ROOT_DIR/swarm/stack.with-postgres.yml" ]; then
    STACK_FILE="$ROOT_DIR/swarm/stack.with-postgres.yml"
  else
    STACK_FILE="$ROOT_DIR/swarm/stack.yml"
  fi
fi
if [ ! -f "$STACK_FILE" ]; then
  die "Stack file not found: $STACK_FILE"
fi

if [ "$DO_DEPLOY" = "true" ]; then
  require_cmd docker
  if ! docker stack config -c "$STACK_FILE" >/dev/null 2>&1; then
    die "Stack file is invalid: $STACK_FILE"
  fi
  if grep -q "traefik-public" "$STACK_FILE"; then
    if ! docker network inspect "$TRAEFIK_PUBLIC_NETWORK" >/dev/null 2>&1; then
      die "External network not found: $TRAEFIK_PUBLIC_NETWORK"
    fi
  fi
  if grep -q "POSTGRES_DB" "$STACK_FILE"; then
    : "${POSTGRES_DB:?Missing POSTGRES_DB (from $ENV_FILE)}"
    : "${POSTGRES_USER:?Missing POSTGRES_USER (from $ENV_FILE)}"
    : "${POSTGRES_PASSWORD:?Missing POSTGRES_PASSWORD (from $ENV_FILE)}"
    : "${DATABASE_URL:?Missing DATABASE_URL (from $ENV_FILE)}"
    if [[ "$DATABASE_URL" != postgres://* && "$DATABASE_URL" != postgresql://* ]]; then
      die "DATABASE_URL must start with postgres:// or postgresql://"
    fi
    if [[ "$DATABASE_URL" == *" "* ]]; then
      die "DATABASE_URL must not contain spaces"
    fi
  fi
  if [ "${CREATE_ADMIN:-}" = "true" ] || [ -n "${ADMIN_EMAIL:-}" ] || [ -n "${ADMIN_PASSWORD:-}" ]; then
    : "${ADMIN_EMAIL:?Missing ADMIN_EMAIL (from $ENV_FILE)}"
    : "${ADMIN_PASSWORD:?Missing ADMIN_PASSWORD (from $ENV_FILE)}"
  fi
fi

IMAGE="${DOCKERHUB_USER}/${IMAGE_NAME}"
if [ -z "${TAG:-}" ]; then
  TAG="$(compute_tag)"
fi

export IMAGE TAG DOMAIN TRAEFIK_PUBLIC_NETWORK TRAEFIK_CERTRESOLVER PORT NODE_ENV STACK_FILE

log "Using env file: $ENV_FILE"
log "Image: ${IMAGE}:${TAG}"

if [ "$DO_BUILD" = "true" ]; then
  require_cmd docker

  if docker buildx version >/dev/null 2>&1; then
    log "Building image with buildx (linux/amd64)"
    docker buildx build \
      --platform linux/amd64 \
      -t "${IMAGE}:${TAG}" \
      -t "${IMAGE}:latest" \
      -f "$ROOT_DIR/docker/Dockerfile" \
      "$ROOT_DIR" \
      --load
  else
    log "Building image with docker build"
    docker build \
      -t "${IMAGE}:${TAG}" \
      -t "${IMAGE}:latest" \
      -f "$ROOT_DIR/docker/Dockerfile" \
      "$ROOT_DIR"
  fi

  if [ "$DO_PUSH" = "true" ]; then
    ensure_logged_in_dockerhub
    log "Pushing image to Docker Hub"
    docker push "${IMAGE}:${TAG}"
    docker push "${IMAGE}:latest"
  fi
fi

if [ "$DO_DEPLOY" = "true" ]; then
  log "Deploying stack: ${STACK_NAME}"
  docker stack deploy -c "$STACK_FILE" --with-registry-auth "${STACK_NAME}"

  log "Services"
  docker service ls | grep "${STACK_NAME}" || true
  docker service ps "${STACK_NAME}_lms" || true

  if [ "${CREATE_ADMIN:-}" = "true" ] || [ -n "${ADMIN_EMAIL:-}" ] || [ -n "${ADMIN_PASSWORD:-}" ]; then
    : "${ADMIN_FIRST_NAME:=Admin}"
    : "${ADMIN_LAST_NAME:=Botmaker}"
    : "${ADMIN_LOCALE:=pt}"

    log "Ensuring admin user exists: ${ADMIN_EMAIL}"
    admin_cid=""
    for _ in {1..30}; do
      admin_cid="$(docker ps --filter "name=${STACK_NAME}_lms" -q | head -n1 || true)"
      [ -n "$admin_cid" ] && break
      sleep 2
    done
    if [ -z "$admin_cid" ]; then
      warn "No running container found for ${STACK_NAME}_lms; skipping admin creation"
    else
      docker exec \
        -e ADMIN_EMAIL="$ADMIN_EMAIL" \
        -e ADMIN_PASSWORD="$ADMIN_PASSWORD" \
        -e ADMIN_FIRST_NAME="$ADMIN_FIRST_NAME" \
        -e ADMIN_LAST_NAME="$ADMIN_LAST_NAME" \
        -e ADMIN_LOCALE="$ADMIN_LOCALE" \
        "$admin_cid" \
        node <<'NODE'
const { PrismaClient } = require("@prisma/client")
const argon2 = require("argon2")

async function main() {
  const prisma = new PrismaClient()
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL/ADMIN_PASSWORD not set")
  }
  const firstName = process.env.ADMIN_FIRST_NAME || "Admin"
  const lastName = process.env.ADMIN_LAST_NAME || "Botmaker"
  const preferredLocale = process.env.ADMIN_LOCALE || "pt"
  const hash = await argon2.hash(password)
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash: hash, role: "ADMIN", emailVerifiedAt: new Date() },
    create: {
      firstName,
      lastName,
      email,
      passwordHash: hash,
      role: "ADMIN",
      preferredLocale,
      emailVerifiedAt: new Date(),
    },
  })
  await prisma.$disconnect()
  console.log("Admin created/updated")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
NODE
    fi
  fi

  log "Logs"
  echo "docker service logs -f ${STACK_NAME}_lms"
fi

log "Deploy summary"
log "Image: ${IMAGE}:${TAG}"
log "Domain: ${DOMAIN}"
log "Stack: ${STACK_NAME}"
