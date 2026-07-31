#!/usr/bin/env sh
# Production/Dokploy entrypoint for the BullMQ worker with an elevated V8 heap.
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
cd "$ROOT_DIR"

case "${NODE_OPTIONS:-}" in
  *--max-old-space-size=*) ;;
  *)
    NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--max-old-space-size=8192"
    export NODE_OPTIONS
    ;;
esac

exec ./node_modules/.bin/tsx cli/worker/index.ts "$@"
