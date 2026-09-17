#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# shellcheck source=./helpers.sh
source "$SCRIPT_DIR/helpers.sh"

if [ $# -ne 1 ]; then
  echo "Usage: $0 <tag>"
  exit 1
fi

ROLLBACK_TAG="$1"

ENV_FILE="$ROOT_DIR/.env.production"
if [ ! -f "$ENV_FILE" ]; then
  ENV_FILE="$ROOT_DIR/.env"
fi

load_env "$ENV_FILE"

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

IMAGE="${DOCKERHUB_USER}/${IMAGE_NAME}"
TAG="$ROLLBACK_TAG"

export IMAGE TAG DOMAIN TRAEFIK_PUBLIC_NETWORK TRAEFIK_CERTRESOLVER PORT NODE_ENV STACK_FILE

if ! docker image inspect "${IMAGE}:${TAG}" >/dev/null 2>&1; then
  log "Image not found locally. Pulling ${IMAGE}:${TAG}"
  docker pull "${IMAGE}:${TAG}"
fi

log "Rolling back stack ${STACK_NAME} to tag ${TAG}"

docker stack deploy -c "$STACK_FILE" --with-registry-auth "${STACK_NAME}"

log "Services"

docker service ls | grep "${STACK_NAME}" || true

docker service ps "${STACK_NAME}_lms" || true

log "Rollback summary"
log "Image: ${IMAGE}:${TAG}"
log "Domain: ${DOMAIN}"
log "Stack: ${STACK_NAME}"
