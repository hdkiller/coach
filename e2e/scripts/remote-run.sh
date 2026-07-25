#!/usr/bin/env bash
# Run on the Mac Mini: ensure e2e infra + app, then Playwright.
# Invoked via: pnpm e2e:remote  (from laptop) or directly on the Mini.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
E2E_ENSURE_PLAYWRIGHT=1 bash "${ROOT}/e2e/scripts/ensure-mini-stack.sh"

echo "==> Playwright"
cd "${ROOT}"
pnpm test:e2e
