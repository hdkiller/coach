import { describe, expect, it, vi } from 'vitest'
import { adjustCalendarDate, parseCalendarDate, resolveRelativeDateReference } from './date'

vi.mock('./db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    }
  }
}))

describe('date utilities', () => {
  it('rejects impossible leap-year dates', () => {
    expect(parseCalendarDate('2026-02-29')).toBeNull()
    expect(parseCalendarDate('2024-02-29')).toBeInstanceOf(Date)
  })

  it('resolves yesterday without hallucinating Feb 29 on non-leap years', () => {
    const result = resolveRelativeDateReference('yesterday', 'Europe/Budapest', '2026-03-01')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.resolvedDateString).toBe('2026-02-28')
    }
  })

  it('resolves last night to yesterday with an evening hint', () => {
    const result = resolveRelativeDateReference('last night', 'Europe/Budapest', '2026-03-01')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.resolvedDateString).toBe('2026-02-28')
      expect(result.assumedTimeOfDay).toBe('evening')
    }
  })

  it('supports simple day arithmetic from a base date', () => {
    const result = adjustCalendarDate('2026-03-01', -1)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.resolvedDateString).toBe('2026-02-28')
    }
  })
})
