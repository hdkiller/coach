import { describe, expect, it } from 'vitest'
import {
  appendNodeOption,
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
})
