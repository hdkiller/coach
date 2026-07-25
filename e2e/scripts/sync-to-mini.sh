#!/usr/bin/env bash
# Sync local working tree to Mac Mini e2e host (pre-push iteration).
set -euo pipefail

HOST="${E2E_REMOTE_HOST:-hdkiller@100.111.49.87}"
REMOTE_DIR="${E2E_REMOTE_DIR:-~/Develop/coach-wattz}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

rsync -az --delete \
  --exclude .git \
  --exclude node_modules \
  --exclude .output \
  --exclude .nuxt \
  --exclude .trigger \
  --exclude .pnpm-store \
  --exclude coverage \
  --exclude playwright-report \
  --exclude test-results \
  --exclude blob-report \
  --exclude .env \
  --exclude .env.e2e \
  --exclude .env.bak \
  --exclude .env.sentry-build-plugin \
  --exclude gcs-key.json \
  --exclude backups \
  --exclude logs \
  --exclude tmp \
  --exclude nanobanana-output \
  --exclude screenshots \
  --exclude .DS_Store \
  -e 'ssh -o BatchMode=yes' \
  "${ROOT}/" \
  "${HOST}:${REMOTE_DIR}/"

echo "Synced ${ROOT} → ${HOST}:${REMOTE_DIR}"
