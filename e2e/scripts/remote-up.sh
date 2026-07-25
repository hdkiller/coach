#!/usr/bin/env bash
# From laptop: optionally sync, then ensure Mini e2e infra + app (no Playwright).
set -euo pipefail

HOST="${E2E_REMOTE_HOST:-hdkiller@100.111.49.87}"
REMOTE_DIR="${E2E_REMOTE_DIR:-~/Develop/coach-wattz}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

if [ "${E2E_REMOTE_SYNC:-0}" = "1" ]; then
  bash "${ROOT}/e2e/scripts/sync-to-mini.sh"
fi

ssh -o BatchMode=yes "${HOST}" "bash ${REMOTE_DIR}/e2e/scripts/ensure-mini-stack.sh"
echo "Mini e2e stack ready. App: http://100.111.49.87:3199/ (or pnpm e2e:tunnel → http://127.0.0.1:3199/)"
