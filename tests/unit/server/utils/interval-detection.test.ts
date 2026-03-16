import { describe, expect, it } from 'vitest'
import { detectIntervals } from '../../../../server/utils/interval-detection'

describe('detectIntervals', () => {
  it('preserves the final recovery block before cooldown for plan-guided detection', () => {
    const warmup = Array.from({ length: 1200 }, () => 127)
    const work1 = Array.from({ length: 480 }, () => 153)
    const recovery1 = Array.from({ length: 120 }, () => 113)
    const work2 = Array.from({ length: 480 }, () => 153)
    const recovery2 = Array.from({ length: 120 }, () => 113)
    const work3 = Array.from({ length: 480 }, () => 153)
    const recovery3 = Array.from({ length: 120 }, (_, index) => (index < 100 ? 113 : 110))
    const cooldown = Array.from({ length: 600 }, (_, index) => 108 - index * 0.03)

    const time = Array.from(
      {
        length:
          warmup.length +
          work1.length +
          recovery1.length +
          work2.length +
          recovery2.length +
          work3.length +
          recovery3.length +
          cooldown.length
      },
      (_, index) => index
    )
    const watts = [
      ...warmup,
      ...work1,
      ...recovery1,
      ...work2,
      ...recovery2,
      ...work3,
      ...recovery3,
      ...cooldown
    ]
    const cadence = [
      ...Array.from({ length: 1200 }, () => 90),
      ...Array.from({ length: 480 }, () => 92),
      ...Array.from({ length: 120 }, () => 80),
      ...Array.from({ length: 480 }, () => 92),
      ...Array.from({ length: 120 }, () => 80),
      ...Array.from({ length: 480 }, () => 92),
      ...Array.from({ length: 120 }, () => 80),
      ...Array.from({ length: 600 }, (_, index) => 78 - index * 0.005)
    ]

    const plannedSteps = [
      {
        type: 'WARMUP',
        durationSeconds: 1200,
        power: { range: { start: 0.5, end: 0.7 } },
        cadence: 90
      },
      { type: 'WORK', durationSeconds: 480, power: { value: 0.72 }, cadence: 92 },
      { type: 'RECOVERY', durationSeconds: 120, power: { value: 0.52 }, cadence: 80 },
      { type: 'WORK', durationSeconds: 480, power: { value: 0.72 }, cadence: 92 },
      { type: 'RECOVERY', durationSeconds: 120, power: { value: 0.52 }, cadence: 80 },
      { type: 'WORK', durationSeconds: 480, power: { value: 0.72 }, cadence: 92 },
      { type: 'RECOVERY', durationSeconds: 120, power: { value: 0.52 }, cadence: 80 },
      {
        type: 'COOLDOWN',
        durationSeconds: 600,
        power: { range: { start: 0.5, end: 0.3 } },
        cadence: 75,
        ramp: true
      }
    ]

    const intervals = detectIntervals(time, watts, 'power', 212, plannedSteps, undefined, cadence)

    expect(intervals.map((interval) => interval.type)).toEqual([
      'WARMUP',
      'WORK',
      'RECOVERY',
      'WORK',
      'RECOVERY',
      'WORK',
      'RECOVERY',
      'COOLDOWN'
    ])
    expect(intervals[6]?.duration).toBeGreaterThanOrEqual(100)
    expect(intervals[6]?.avg_cadence).toBeGreaterThanOrEqual(78)
    expect(intervals[7]?.avg_cadence).toBeLessThan(intervals[6]?.avg_cadence || 999)
    expect(intervals[6]?.detection_confidence).toBeGreaterThan(0.35)
  })
})
