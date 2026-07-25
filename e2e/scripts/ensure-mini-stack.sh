#!/usr/bin/env bash
# Run on the Mac Mini: ensure e2e deps, Docker infra, and host Nuxt on :3199.
# Used by remote-run.sh and (via SSH) by laptop ui-remote / tunnel helpers.
set -euo pipefail

export PATH="/usr/local/bin:${HOME}/.local/bin:${PATH}"

# Prefer nvm Node 24 (package engines) over Homebrew Node 26 on the Mini.
if [ -s "${HOME}/.nvm/nvm.sh" ]; then
  set +u
  # shellcheck disable=SC1091
  . "${HOME}/.nvm/nvm.sh"
  set -u
fi

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "${ROOT}"

if command -v nvm >/dev/null 2>&1; then
  set +u
  if [ -f .nvmrc ]; then
    nvm use || nvm install || nvm use 24
  else
    nvm use 24 || true
  fi
  set -u
fi

echo "==> Node $(node -v) / pnpm $(pnpm -v)"

if [ ! -f .env.e2e ]; then
  cp .env.e2e.example .env.e2e
fi

echo "==> Ensuring dependencies"
NODE_MARKER="node_modules/.coach-e2e-node-version"
CURRENT_NODE="$(node -v)"
NEED_INSTALL=0
if [ ! -d node_modules ] || [ package.json -nt node_modules ] || [ pnpm-lock.yaml -nt node_modules ]; then
  NEED_INSTALL=1
elif [ ! -f "${NODE_MARKER}" ] || [ "$(cat "${NODE_MARKER}")" != "${CURRENT_NODE}" ]; then
  NEED_INSTALL=1
fi
if [ "${NEED_INSTALL}" = "1" ]; then
  pnpm install --frozen-lockfile
  # Native addons (better-sqlite3, bcrypt) must match the active Node ABI.
  pnpm rebuild better-sqlite3 bcrypt >/dev/null
  printf '%s\n' "${CURRENT_NODE}" > "${NODE_MARKER}"
fi

if [ "${E2E_ENSURE_PLAYWRIGHT:-0}" = "1" ]; then
  echo "==> Ensuring Playwright Chromium"
  pnpm exec playwright install chromium
fi

echo "==> Starting e2e infra (Postgres :5440, Redis :6389)"
pnpm e2e:up:infra

BASE_URL="${E2E_BASE_URL:-http://localhost:3199}"

app_ready() {
  curl -sf -o /dev/null "${BASE_URL}/api/health"
}

if ! app_ready; then
  echo "==> Starting e2e:app:host on :3199"
  if lsof -tiTCP:3199 -sTCP:LISTEN >/dev/null 2>&1; then
    echo "==> Port 3199 busy; stopping previous listener"
    lsof -tiTCP:3199 -sTCP:LISTEN | xargs kill || true
    sleep 2
  fi
  nohup pnpm e2e:app:host > /tmp/coach-wattz-e2e-serve.log 2>&1 &
  for i in $(seq 1 120); do
    if app_ready; then
      echo "==> App ready at ${BASE_URL}"
      break
    fi
    if [ "$i" -eq 120 ]; then
      echo "Timed out waiting for e2e app. Tail of /tmp/coach-wattz-e2e-serve.log:"
      tail -80 /tmp/coach-wattz-e2e-serve.log || true
      exit 1
    fi
    sleep 5
  done
else
  echo "==> Reusing existing e2e app on ${BASE_URL}"
fi
