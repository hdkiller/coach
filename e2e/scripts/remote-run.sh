#!/usr/bin/env bash
# Run on the Mac Mini: ensure e2e infra + app, then Playwright.
# Invoked via: pnpm e2e:remote  (from laptop) or directly on the Mini.
set -euo pipefail

export PATH="/usr/local/bin:${HOME}/.local/bin:${PATH}"

# Prefer nvm Node 24 (package engines) over Homebrew Node on the Mini.
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

E2E_ENSURE_PLAYWRIGHT=1 bash "${ROOT}/e2e/scripts/ensure-mini-stack.sh"

echo "==> Playwright"
pnpm test:e2e
