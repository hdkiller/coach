#!/usr/bin/env bash
# From laptop: fetch + check out a git branch on the Mac Mini (origin).
# Prefer this over e2e:sync when testing a pushed branch (e.g. develop).
set -euo pipefail

HOST="${E2E_REMOTE_HOST:-hdkiller@100.111.49.87}"
REMOTE_DIR="${E2E_REMOTE_DIR:-~/Develop/coach-wattz}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

BRANCH="${1:-${E2E_REMOTE_BRANCH:-}}"
if [ -z "${BRANCH}" ]; then
  BRANCH="$(git -C "${ROOT}" branch --show-current)"
fi
if [ -z "${BRANCH}" ] || [ "${BRANCH}" = "HEAD" ]; then
  echo "Usage: $0 <branch>   (or set E2E_REMOTE_BRANCH / run from a named branch)" >&2
  exit 1
fi

if git -C "${ROOT}" rev-parse --verify "refs/remotes/origin/${BRANCH}" >/dev/null 2>&1; then
  if git -C "${ROOT}" rev-parse --verify "refs/heads/${BRANCH}" >/dev/null 2>&1; then
    LOCAL_SHA="$(git -C "${ROOT}" rev-parse "refs/heads/${BRANCH}")"
    REMOTE_SHA="$(git -C "${ROOT}" rev-parse "refs/remotes/origin/${BRANCH}")"
    if [ "${LOCAL_SHA}" != "${REMOTE_SHA}" ]; then
      echo "Warning: local ${BRANCH} ($(git -C "${ROOT}" rev-parse --short "${LOCAL_SHA}")) differs from origin/${BRANCH} ($(git -C "${ROOT}" rev-parse --short "${REMOTE_SHA}")). Mini will use origin." >&2
    fi
  fi
fi

# shellcheck disable=SC2029
ssh -o BatchMode=yes "${HOST}" \
  "BRANCH=$(printf '%q' "${BRANCH}") REMOTE_DIR=$(printf '%q' "${REMOTE_DIR}") bash -s" <<'EOF'
set -euo pipefail
export PATH="/usr/local/bin:${HOME}/.local/bin:${PATH}"

# Expand leading ~
case "${REMOTE_DIR}" in
  "~/"*) REMOTE_DIR="${HOME}/${REMOTE_DIR#~/}" ;;
  "~") REMOTE_DIR="${HOME}" ;;
esac

cd "${REMOTE_DIR}"

echo "==> Fetching origin/${BRANCH}"
git fetch --prune origin "${BRANCH}"

echo "==> Resetting Mini working tree (rsync/local debris) before checkout"
# -x also drops ignored untracked files that would block checkout; keep env + heavy dirs
git reset --hard HEAD
git clean -fdx \
  -e .env.e2e \
  -e node_modules \
  -e .output \
  -e .nuxt \
  -e .trigger \
  -e playwright-report \
  -e test-results

echo "==> Checking out ${BRANCH} @ origin/${BRANCH}"
git checkout -f -B "${BRANCH}" "origin/${BRANCH}"
git reset --hard "origin/${BRANCH}"

echo "==> Mini at ${BRANCH} @ $(git rev-parse --short HEAD)"

# Force ensure-mini-stack to start a fresh app process for the new tree
if lsof -tiTCP:3199 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "==> Stopping e2e app on :3199 (tree changed)"
  lsof -tiTCP:3199 -sTCP:LISTEN | xargs kill || true
fi
EOF

echo "Checked out origin/${BRANCH} on ${HOST}:${REMOTE_DIR}"
