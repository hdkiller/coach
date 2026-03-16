import { describe, expect, it } from 'vitest'
import { buildWellnessEventOverlays } from '../../../../../server/utils/services/wellnessEventService'

describe('buildWellnessEventOverlays', () => {
  it('merges adjacent daily wellness tags into a single overlay band', () => {
    const events = buildWellnessEventOverlays({
      wellnessEntries: [
        {
          id: 'w1',
          date: new Date('2026-02-20T00:00:00Z'),
          tags: 'Sick'
        },
        {
          id: 'w2',
          date: new Date('2026-02-21T00:00:00Z'),
          tags: 'Sick'
        }
      ]
    })

    expect(events).toHaveLength(1)
    expect(events[0].label).toBe('Sick')
    expect(events[0].startDate.toISOString()).toBe('2026-02-20T00:00:00.000Z')
    expect(events[0].endDate.toISOString()).toBe('2026-02-21T00:00:00.000Z')
  })

  it('keeps ranged calendar wellness notes as overlay bands', () => {
    const events = buildWellnessEventOverlays({
      calendarNotes: [
        {
          id: 'n1',
          title: 'Sick',
          category: 'SICK',
          startDate: new Date('2026-02-24T00:00:00Z'),
          endDate: new Date('2026-02-27T00:00:00Z')
        }
      ]
    })

    expect(events).toHaveLength(1)
    expect(events[0].label).toBe('Sick')
    expect(events[0].startDate.toISOString()).toBe('2026-02-24T00:00:00.000Z')
    expect(events[0].endDate.toISOString()).toBe('2026-02-27T00:00:00.000Z')
  })
})
