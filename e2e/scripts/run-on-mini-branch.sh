#!/usr/bin/env bash
# From laptop: check out a branch on the Mini (git), then run Playwright there.
# Does not rsync — uses origin/<branch> only.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BRANCH="${1:-${E2E_REMOTE_BRANCH:-}}"

bash "${ROOT}/e2e/scripts/checkout-on-mini.sh" ${BRANCH:+"${BRANCH}"}

E2E_REMOTE_SYNC=0 bash "${ROOT}/e2e/scripts/run-on-mini.sh"
