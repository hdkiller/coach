import { describe, expect, it } from 'vitest'
import {
  appendNodeOption,
  buildRelaunchArgs,
  hasMaxOldSpaceSize,
  WORKER_MAX_OLD_SPACE_SIZE_MB
} from '../../../cli/worker/ensure-heap'

describe('worker ensure-heap helpers', () => {
  it('detects an existing max-old-space-size flag', () => {
    expect(hasMaxOldSpaceSize('--max-old-space-size=8192')).toBe(true)
    expect(hasMaxOldSpaceSize('FOO=1 --max-old-space-size=4096')).toBe(true)
    expect(hasMaxOldSpaceSize('--inspect')).toBe(false)
    expect(hasMaxOldSpaceSize('')).toBe(false)
  })

  it('appends the heap flag without dropping existing NODE_OPTIONS', () => {
    expect(appendNodeOption('', `--max-old-space-size=${WORKER_MAX_OLD_SPACE_SIZE_MB}`)).toBe(
      `--max-old-space-size=${WORKER_MAX_OLD_SPACE_SIZE_MB}`
    )
    expect(
      appendNodeOption('--inspect', `--max-old-space-size=${WORKER_MAX_OLD_SPACE_SIZE_MB}`)
    ).toBe(`--inspect --max-old-space-size=${WORKER_MAX_OLD_SPACE_SIZE_MB}`)
  })

  it('preserves execArgv loader flags (e.g. tsx) when rebuilding the relaunch argv', () => {
    // Regression: tsx injects itself via execArgv, not argv. Dropping execArgv
    // on relaunch runs bare `node cli/worker/index.ts`, which cannot resolve
    // extensionless relative imports and fails with ERR_MODULE_NOT_FOUND.
    const execArgv = [
      '--require',
      '/app/node_modules/tsx/dist/preflight.cjs',
      '--import',
      'file:///app/node_modules/tsx/dist/loader.mjs'
    ]
    const argv = ['/usr/bin/node', 'cli/worker/index.ts', 'start']

    expect(buildRelaunchArgs(execArgv, argv)).toEqual([...execArgv, 'cli/worker/index.ts', 'start'])
  })

  it('drops only argv[0] (the node binary), keeping the rest of argv intact', () => {
    expect(buildRelaunchArgs([], ['/usr/bin/node', 'script.ts', 'foo', 'bar'])).toEqual([
      'script.ts',
      'foo',
      'bar'
    ])
  })
})
