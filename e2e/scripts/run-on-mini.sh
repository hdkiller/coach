#!/usr/bin/env bash
# From laptop: optionally sync, then run e2e on Mac Mini over Tailscale SSH.
set -euo pipefail

HOST="${E2E_REMOTE_HOST:-hdkiller@100.111.49.87}"
REMOTE_DIR="${E2E_REMOTE_DIR:-~/Develop/coach-wattz}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

if [ "${E2E_REMOTE_SYNC:-1}" = "1" ]; then
  bash "${ROOT}/e2e/scripts/sync-to-mini.sh"
fi

ssh -o BatchMode=yes "${HOST}" "bash ${REMOTE_DIR}/e2e/scripts/remote-run.sh"
