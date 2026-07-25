#!/usr/bin/env bash
# From laptop: ensure Mini e2e stack, tunnel ports, open Playwright UI Mode locally.
set -euo pipefail

HOST="${E2E_REMOTE_HOST:-hdkiller@100.111.49.87}"
REMOTE_DIR="${E2E_REMOTE_DIR:-~/Develop/coach-wattz}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# UI opens swiftly by default; set E2E_REMOTE_SYNC=1 to rsync first.
if [ "${E2E_REMOTE_SYNC:-0}" = "1" ]; then
  bash "${ROOT}/e2e/scripts/sync-to-mini.sh"
fi

echo "==> Ensuring Mini e2e stack"
ssh -o BatchMode=yes "${HOST}" "bash ${REMOTE_DIR}/e2e/scripts/ensure-mini-stack.sh"

bash "${ROOT}/e2e/scripts/tunnel-to-mini.sh"

echo "==> Playwright UI (against Mini via localhost tunnels)"
cd "${ROOT}"
exec pnpm exec playwright test --ui
