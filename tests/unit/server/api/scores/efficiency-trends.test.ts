import { describe, expect, it } from 'vitest'
import { buildEfficiencyTrendData } from '../../../../../server/utils/efficiency-trends'

describe('buildEfficiencyTrendData', () => {
  it('preserves the full workout timestamp for chart rendering', () => {
    const result = buildEfficiencyTrendData([
      {
        id: '498ad1d7-0db6-4db1-84e2-8eca66b27a78',
        date: '2026-03-12T06:51:00.000Z',
        normalizedPower: 210,
        averageHr: 140,
        rawJson: null
      }
    ])

    expect(result).toEqual([
      expect.objectContaining({
        workoutId: '498ad1d7-0db6-4db1-84e2-8eca66b27a78',
        date: '2026-03-12',
        timestamp: '2026-03-12T06:51:00.000Z',
        efficiencyFactor: 1.5
      })
    ])
  })
})
