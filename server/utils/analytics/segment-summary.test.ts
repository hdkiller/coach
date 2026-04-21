import { describe, expect, it } from 'vitest'
import { calculateSegmentMetricsFromStreams } from './segment-summary'

describe('calculateSegmentMetricsFromStreams', () => {
  it('calculates power and elevation metrics for a selected segment', () => {
    const metrics = calculateSegmentMetricsFromStreams(
      {
        time: [0, 10, 20, 30],
        distance: [0, 100, 200, 300],
        watts: [100, 200, 300, 400],
        altitude: [100, 110, 105, 130]
      },
      1,
      3
    )

    expect(metrics.averageWatts).toBe(300)
    expect(metrics.normalizedPower).toBe(300)
    expect(metrics.distanceMeters).toBe(200)
    expect(metrics.elevationGain).toBe(25)
    expect(metrics.gradientPercent).toBe(10)
    expect(metrics.vam).toBe(4500)
  })

  it('returns unavailable metric values when optional streams are missing', () => {
    const metrics = calculateSegmentMetricsFromStreams(
      {
        time: [0, 10, 20]
      },
      0,
      2
    )

    expect(metrics.averageWatts).toBeNull()
    expect(metrics.normalizedPower).toBeNull()
    expect(metrics.gradientPercent).toBeNull()
    expect(metrics.elevationGain).toBe(0)
    expect(metrics.vam).toBeNull()
  })
})
