import { describe, expect, it } from 'vitest'
import { getCalendarActivityDateKey } from '../../../app/utils/calendar'

describe('Calendar activity day keys', () => {
  it('uses the viewer timezone for completed workouts', () => {
    const dateKey = getCalendarActivityDateKey(
      {
        source: 'completed',
        date: '2026-03-08T01:00:55.000Z'
      },
      'America/New_York'
    )

    expect(dateKey).toBe('2026-03-07')
  })

  it('keeps planned workouts on their UTC calendar day', () => {
    const dateKey = getCalendarActivityDateKey(
      {
        source: 'planned',
        date: '2026-03-08T00:00:00.000Z'
      },
      'America/New_York'
    )

    expect(dateKey).toBe('2026-03-08')
  })
})
