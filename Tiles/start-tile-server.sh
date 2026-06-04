#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
NGINX_PREFIX="${TMPDIR:-/tmp}/artemis-tiles-nginx"
PID_FILE="$NGINX_PREFIX/nginx.pid"
CONFIG_FILE="$NGINX_PREFIX/nginx.conf"

mkdir -p "$NGINX_PREFIX/logs" "$NGINX_PREFIX/client_body_temp"

TILES_ROOT="${SCRIPT_DIR//\\/\/}"
sed "s#__TILES_ROOT__#$TILES_ROOT#g" "$SCRIPT_DIR/nginx.conf.template" > "$CONFIG_FILE"

if [[ -s "$PID_FILE" ]]; then
  nginx -s quit -c "$CONFIG_FILE" -p "$NGINX_PREFIX" || true

  for _ in {1..25}; do
    [[ ! -s "$PID_FILE" ]] && break
    sleep 0.1
  done
fi

exec nginx -c "$CONFIG_FILE" -p "$NGINX_PREFIX"
