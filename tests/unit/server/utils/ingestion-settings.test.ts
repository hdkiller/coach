import { describe, expect, it } from 'vitest'
import { isAutoDeduplicateWorkoutsEnabled } from '../../../../app/utils/ingestion-settings'

describe('ingestion settings', () => {
  it('defaults automatic deduplication to enabled', () => {
    expect(isAutoDeduplicateWorkoutsEnabled(undefined)).toBe(true)
    expect(isAutoDeduplicateWorkoutsEnabled({})).toBe(true)
    expect(isAutoDeduplicateWorkoutsEnabled({ ingestion: {} })).toBe(true)
  })

  it('returns false when automatic deduplication is disabled', () => {
    expect(
      isAutoDeduplicateWorkoutsEnabled({
        ingestion: { autoDeduplicateWorkouts: false }
      })
    ).toBe(false)
  })

  it('returns true when automatic deduplication is explicitly enabled', () => {
    expect(
      isAutoDeduplicateWorkoutsEnabled({
        ingestion: { autoDeduplicateWorkouts: true }
      })
    ).toBe(true)
  })
})
