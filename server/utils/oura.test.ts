import { describe, expect, it } from 'vitest'
import { normalizeOuraWellness } from './oura'

describe('normalizeOuraWellness', () => {
  it('maps Oura sleep stage durations into wellness fields', () => {
    const result = normalizeOuraWellness(
      { score: 86, total_sleep_duration: 27360 },
      null,
      { score: 91, temperature_deviation: 0.06 },
      [
        {
          type: 'long_sleep',
          total_sleep_duration: 27360,
          deep_sleep_duration: 4770,
          rem_sleep_duration: 8010,
          light_sleep_duration: 14580,
          awake_time: 4630,
          lowest_heart_rate: 58,
          average_hrv: 22,
          average_heart_rate: 63.125,
          average_breath: 14.125
        }
      ],
      'user-1',
      new Date('2026-03-01T00:00:00.000Z')
    )

    expect(result).toMatchObject({
      sleepSecs: 27360,
      sleepDeepSecs: 4770,
      sleepRemSecs: 8010,
      sleepLightSecs: 14580,
      sleepAwakeSecs: 4630,
      restingHr: 58,
      hrv: 22,
      readiness: 9,
      recoveryScore: 91
    })
  })
})
