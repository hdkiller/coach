#!/usr/bin/env bash
set -euo pipefail
PR="$1"
BRANCH="$2"

cd /Users/hdkiller/Develop/coach-wattz
git fetch origin develop "$BRANCH" >/dev/null 2>&1 || git fetch origin develop

echo "=== PR #$PR ($BRANCH) ==="
gh pr ready "$PR" 2>/dev/null || true

if gh pr merge "$PR" --squash --delete-branch 2>/dev/null; then
  echo "Merged PR #$PR cleanly"
  git fetch origin develop >/dev/null
  exit 0
fi

echo "Conflicts — rebasing $BRANCH onto develop..."
git checkout develop >/dev/null 2>&1
git fetch origin develop >/dev/null
git checkout -B "$BRANCH" "origin/$BRANCH" 2>/dev/null || git checkout "$BRANCH"

if ! git rebase origin/develop; then
  # Resolve doc conflicts: prefer Fixed markers from both sides
  for f in docs/issues/REVIEW-PROGRESS.md docs/issues/app-review-issues.md; do
    if [[ -f "$f" ]] && grep -q '<<<<<<<' "$f" 2>/dev/null; then
      python3 - "$f" <<'PY'
import re, sys
path = sys.argv[1]
text = open(path).read()
while '<<<<<<<' in text:
    text = re.sub(
        r'<<<<<<<[^\n]*\n(.*?)=======\n(.*?)>>>>>>>[^\n]*\n',
        lambda m: m.group(1) if '**Fixed**' in m.group(1) or '~~' in m.group(1) else (m.group(2) if '**Fixed**' in m.group(2) or '~~' in m.group(2) else m.group(1) + m.group(2)),
        text,
        count=1,
        flags=re.S,
    )
open(path, 'w').write(text)
PY
    fi
  done
  # Code conflicts need manual resolution — abort if any remain
  if git diff --name-only --diff-filter=U | grep -qv '^docs/issues/'; then
    echo "Non-doc conflicts remain — manual resolution required:"
    git diff --name-only --diff-filter=U
    exit 1
  fi
  git add -A
  GIT_EDITOR=true git rebase --continue || true
  while [[ -d .git/rebase-merge || -d .git/rebase-apply ]]; do
    for f in docs/issues/REVIEW-PROGRESS.md docs/issues/app-review-issues.md; do
      if [[ -f "$f" ]] && grep -q '<<<<<<<' "$f" 2>/dev/null; then
        python3 - "$f" <<'PY'
import re, sys
path = sys.argv[1]
text = open(path).read()
while '<<<<<<<' in text:
    text = re.sub(
        r'<<<<<<<[^\n]*\n(.*?)=======\n(.*?)>>>>>>>[^\n]*\n',
        lambda m: m.group(1) if '**Fixed**' in m.group(1) or '~~' in m.group(1) else (m.group(2) if '**Fixed**' in m.group(2) or '~~' in m.group(2) else m.group(1) + m.group(2)),
        text,
        count=1,
        flags=re.S,
    )
open(path, 'w').write(text)
PY
      fi
    done
    if git diff --name-only --diff-filter=U | grep -qv '^docs/issues/'; then
      echo "Non-doc conflicts remain"
      git diff --name-only --diff-filter=U
      exit 1
    fi
    git add -A
    GIT_EDITOR=true git rebase --continue || break
  done
fi

git push --force-with-lease origin "$BRANCH"
sleep 2
gh pr merge "$PR" --squash --delete-branch
git fetch origin develop >/dev/null
echo "Merged PR #$PR after rebase"
