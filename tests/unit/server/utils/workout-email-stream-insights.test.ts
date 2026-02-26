import { describe, expect, it } from 'vitest'
import { buildWorkoutStreamInsights } from '../../../../server/utils/workout-email-stream-insights'

describe('workout email stream insights', () => {
  it('builds high-value bullets when stream data is complete', () => {
    const points = 3678
    const time = Array.from({ length: points }, (_, i) => i)
    const watts = Array.from({ length: points }, (_, i) => (i < points / 2 ? 180 : 186))
    const heartrate = Array.from({ length: points }, (_, i) => (i < points / 2 ? 115 : 138))
    const cadence = Array.from({ length: points }, (_, i) => (i % 20 === 0 ? 88 : 90))
    const distance = Array.from({ length: points }, (_, i) => i * 8.5)

    const result = buildWorkoutStreamInsights({
      durationSec: 3200,
      decouplingPct: 4.3,
      ftp: 250,
      wPrime: 20000,
      streams: {
        time,
        watts,
        heartrate,
        cadence,
        distance
      }
    })

    expect(result.bullets.length).toBeGreaterThan(2)
    expect(
      result.bullets.some((bullet) =>
        bullet.includes(
          'Data quality: time/watts/heartrate/cadence/distance streams are complete and aligned'
        )
      )
    ).toBe(true)
    expect(result.bullets.some((bullet) => bullet.includes('Duration check:'))).toBe(true)
    expect(result.bullets.some((bullet) => bullet.includes('Cardio drift:'))).toBe(true)
    expect(result.bullets.length).toBeLessThanOrEqual(5)
    expect(result.whatItMeans).toBeTruthy()
    expect(result.nextWorkoutSuggestion).toBeTruthy()
  })

  it('returns no insights when streams are missing', () => {
    const result = buildWorkoutStreamInsights({
      durationSec: 3600,
      streams: undefined
    })

    expect(result.bullets).toEqual([])
    expect(result.whatItMeans).toBeUndefined()
    expect(result.nextWorkoutSuggestion).toBeUndefined()
  })
})
