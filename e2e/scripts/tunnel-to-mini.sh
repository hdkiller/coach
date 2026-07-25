#!/usr/bin/env bash
# From laptop: SSH local forwards to Mac Mini e2e ports (app/db/redis).
set -euo pipefail

HOST="${E2E_REMOTE_HOST:-hdkiller@100.111.49.87}"
PID_FILE="${E2E_TUNNEL_PID_FILE:-/tmp/coach-wattz-e2e-tunnel.pid}"

tunnel_healthy() {
  curl -sf -o /dev/null --connect-timeout 2 http://127.0.0.1:3199/api/health
}

stop_tunnel() {
  if [ -f "${PID_FILE}" ]; then
    old_pid="$(cat "${PID_FILE}" 2>/dev/null || true)"
    if [ -n "${old_pid}" ] && kill -0 "${old_pid}" 2>/dev/null; then
      kill "${old_pid}" 2>/dev/null || true
      sleep 0.5
    fi
    rm -f "${PID_FILE}"
  fi
  # Best-effort cleanup of matching forwards (avoid killing unrelated ssh).
  pkill -f "ssh .*${HOST}.*-L 3199:127.0.0.1:3199" 2>/dev/null || true
}

if [ "${1:-}" = "stop" ]; then
  stop_tunnel
  echo "Stopped e2e tunnel to ${HOST}"
  exit 0
fi

if tunnel_healthy; then
  echo "E2E tunnel already healthy (http://127.0.0.1:3199)"
  exit 0
fi

stop_tunnel

echo "==> Opening SSH tunnel to ${HOST} (3199, 5440, 6389)"
ssh -fN -o BatchMode=yes -o ExitOnForwardFailure=yes \
  -L 3199:127.0.0.1:3199 \
  -L 5440:127.0.0.1:5440 \
  -L 6389:127.0.0.1:6389 \
  "${HOST}"

# Record the background ssh pid (best-effort).
tunnel_pid="$(pgrep -n -f "ssh .*${HOST}.*-L 3199:127.0.0.1:3199" || true)"
if [ -n "${tunnel_pid}" ]; then
  printf '%s\n' "${tunnel_pid}" > "${PID_FILE}"
fi

for i in $(seq 1 20); do
  if tunnel_healthy; then
    echo "Tunnel ready → http://127.0.0.1:3199 (db :5440, redis :6389)"
    exit 0
  fi
  sleep 0.5
done

echo "Tunnel opened but /api/health did not respond. Is the Mini e2e app up? Try: pnpm e2e:remote:up" >&2
exit 1
