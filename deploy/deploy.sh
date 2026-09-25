#!/usr/bin/env bash
# =============================================================================
# SteelForce Admin Web Portal - deploy / rollback on the Docker host.
#
#   ./deploy.sh deploy   <image-ref>   pull, start, health-gate; auto-rollback on failure
#   ./deploy.sh rollback [image-ref]   return to the previous image (or a given one)
#   ./deploy.sh status                 show the current/previous image and container state
#
# Lives next to compose.yaml in the deploy directory (default
# /opt/steelforce-portal). State is two plain files under .state/:
#   current   - the image serving now
#   previous  - the image that served before it (the rollback target)
#
# The new image is pulled BEFORE the running container is touched, so a bad
# tag or a registry outage leaves production exactly as it was. The only
# downtime is the container swap itself (a standalone Next server starts in
# about a second).
# =============================================================================
set -Eeuo pipefail

cd "$(dirname "$0")"

STATE_DIR=.state
WAIT_TIMEOUT="${WAIT_TIMEOUT:-120}"
KEEP_IMAGES="${KEEP_IMAGES:-5}"
mkdir -p "$STATE_DIR"

# Optional host-local settings (PORTAL_PORT, WAIT_TIMEOUT, ...). Compose reads
# this file on its own too; sourcing it here makes PORTAL_PORT visible to the
# health probe below.
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi
PORTAL_PORT="${PORTAL_PORT:-3000}"

log() { printf '[deploy] %s\n' "$*"; }
die() { printf '[deploy] ERROR: %s\n' "$*" >&2; exit 1; }

read_state() { cat "$STATE_DIR/$1" 2>/dev/null || true; }
write_state() { printf '%s\n' "$2" > "$STATE_DIR/$1"; }

compose() { PORTAL_IMAGE="$1" docker compose -f compose.yaml "${@:2}"; }

# Start the given image and block until Docker reports it healthy, then probe
# /healthz from the host as an independent check.
start() {
  local image="$1"
  log "starting $image"
  compose "$image" up -d --no-build --wait --wait-timeout "$WAIT_TIMEOUT" --remove-orphans portal || return 1

  if command -v curl >/dev/null 2>&1; then
    curl -fsS --max-time 5 "http://127.0.0.1:${PORTAL_PORT}/healthz" >/dev/null || return 1
  fi
  log "healthy on 127.0.0.1:${PORTAL_PORT}"
}

# Remove old portal images beyond the newest $KEEP_IMAGES, never touching the
# current or previous one. Only this repository's images are considered.
prune() {
  local current previous repo
  current="$(read_state current)"
  previous="$(read_state previous)"
  repo="${current%%@*}"
  repo="${repo%:*}"
  [[ -n "$repo" ]] || return 0

  docker image ls "$repo" --format '{{.Repository}}:{{.Tag}}' \
    | grep -v ':<none>$' \
    | tail -n +"$((KEEP_IMAGES + 1))" \
    | while read -r ref; do
        [[ "$ref" == "$current" || "$ref" == "$previous" ]] && continue
        docker image rm "$ref" >/dev/null 2>&1 && log "pruned $ref" || true
      done
  docker image prune -f >/dev/null 2>&1 || true
}

cmd_deploy() {
  local new="${1:-}" current
  [[ -n "$new" ]] || die "usage: $0 deploy <image-ref>"
  current="$(read_state current)"

  log "pulling $new"
  docker pull "$new" || die "pull failed - production left untouched on ${current:-<none>}"

  if start "$new"; then
    if [[ -n "$current" && "$current" != "$new" ]]; then
      write_state previous "$current"
    fi
    write_state current "$new"
    prune
    log "deployed $new"
    return 0
  fi

  log "new image failed its health check; recent container logs:"
  compose "$new" logs --tail 50 portal || true

  if [[ -n "$current" ]]; then
    log "rolling back to $current"
    start "$current" || die "ROLLBACK FAILED - investigate immediately"
    die "deploy of $new failed; $current restored"
  fi
  die "deploy of $new failed and there is no previous image to restore"
}

cmd_rollback() {
  local target="${1:-$(read_state previous)}" current
  current="$(read_state current)"
  [[ -n "$target" ]] || die "no previous image recorded; pass one: $0 rollback <image-ref>"
  docker image inspect "$target" >/dev/null 2>&1 || docker pull "$target" \
    || die "image $target is neither local nor pullable"

  start "$target" || die "rollback target $target is unhealthy"
  if [[ -n "$current" && "$current" != "$target" ]]; then
    write_state previous "$current"
  fi
  write_state current "$target"
  log "rolled back to $target"
}

cmd_status() {
  echo "current:  $(read_state current)"
  echo "previous: $(read_state previous)"
  local current
  current="$(read_state current)"
  if [[ -n "$current" ]]; then
    compose "$current" ps portal
  fi
}

case "${1:-}" in
  deploy)   shift; cmd_deploy "$@" ;;
  rollback) shift; cmd_rollback "$@" ;;
  status)   cmd_status ;;
  *)        die "usage: $0 {deploy <image-ref>|rollback [image-ref]|status}" ;;
esac
