import { spawnSync } from 'node:child_process'

export const WORKER_MAX_OLD_SPACE_SIZE_MB = 8192
const HEAP_FLAG = `--max-old-space-size=${WORKER_MAX_OLD_SPACE_SIZE_MB}`
const READY_MARKER = 'CW_WORKER_HEAP_READY'

/**
 * Ensure the worker process is launched with an elevated V8 old-space limit.
 * NODE_OPTIONS is only honored at process start, so we re-exec once when needed.
 */
export function ensureWorkerHeapLimit(): void {
  if (process.env[READY_MARKER] === '1') return

  const nodeOptions = process.env.NODE_OPTIONS || ''
  if (hasMaxOldSpaceSize(nodeOptions)) {
    process.env[READY_MARKER] = '1'
    return
  }

  const nextNodeOptions = appendNodeOption(nodeOptions, HEAP_FLAG)

  // Re-execing under a file watcher would nest watchers; rely on package scripts / run.sh instead.
  if (isWatchInvocation()) {
    process.env.NODE_OPTIONS = nextNodeOptions
    process.env[READY_MARKER] = '1'
    console.warn(
      `[Worker] Heap limit not applied to this watch process. Relaunch with NODE_OPTIONS='${HEAP_FLAG}' or cli/worker/run.sh.`
    )
    return
  }

  process.env.NODE_OPTIONS = nextNodeOptions
  process.env[READY_MARKER] = '1'

  const result = spawnSync(process.argv[0], buildRelaunchArgs(process.execArgv, process.argv), {
    stdio: 'inherit',
    env: process.env
  })

  if (result.error) {
    console.error('[Worker] Failed to relaunch with elevated heap limit:', result.error)
    process.exit(1)
  }

  process.exit(result.status ?? 1)
}

export function hasMaxOldSpaceSize(nodeOptions: string): boolean {
  return /(?:^|\s)--max-old-space-size=\d+/.test(nodeOptions)
}

export function appendNodeOption(nodeOptions: string, flag: string): string {
  return `${nodeOptions} ${flag}`.trim()
}

/**
 * Build the argv for the relaunched process. Runtime loaders (e.g. tsx's
 * --require/--import hooks) are injected via execArgv, not argv — dropping
 * them relaunches under bare node, which cannot resolve our extensionless
 * relative TS imports and fails with ERR_MODULE_NOT_FOUND.
 */
export function buildRelaunchArgs(execArgv: readonly string[], argv: readonly string[]): string[] {
  return [...execArgv, ...argv.slice(1)]
}

function isWatchInvocation(): boolean {
  if (process.execArgv.some((arg) => arg === '--watch' || arg.startsWith('--watch='))) {
    return true
  }
  return process.argv.includes('watch')
}
