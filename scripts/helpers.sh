#!/usr/bin/env bash

log() {
  printf "[%s] %s\n" "$(date +%H:%M:%S)" "$*"
}

warn() {
  printf "[%s] WARN: %s\n" "$(date +%H:%M:%S)" "$*" >&2
}

die() {
  printf "[%s] ERROR: %s\n" "$(date +%H:%M:%S)" "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

load_env() {
  local file="$1"
  [ -f "$file" ] || die "Env file not found: $file"

  while IFS= read -r line || [ -n "$line" ]; do
    line="${line#${line%%[![:space:]]*}}"
    line="${line%${line##*[![:space:]]}}"
    [ -z "$line" ] && continue
    case "$line" in
      \#*) continue ;;
    esac

    if [[ "$line" != *"="* ]]; then
      continue
    fi

    local key="${line%%=*}"
    local value="${line#*=}"

    key="${key#${key%%[![:space:]]*}}"
    key="${key%${key##*[![:space:]]}}"
    value="${value#${value%%[![:space:]]*}}"
    value="${value%${value##*[![:space:]]}}"

    if [[ "$value" =~ ^".*"$ ]] || [[ "$value" =~ ^'.*'$ ]]; then
      value="${value:1:-1}"
    fi

    export "$key=$value"
  done < "$file"
}

compute_tag() {
  if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git rev-parse --short HEAD
  else
    date +%Y%m%d-%H%M%S
  fi
}

ensure_logged_in_dockerhub() {
  require_cmd docker
  if ! docker info >/dev/null 2>&1; then
    die "Docker does not seem to be running."
  fi

  if ! docker info 2>/dev/null | grep -q "Username:"; then
    warn "Docker Hub login not detected. Run: docker login"
  fi
}
