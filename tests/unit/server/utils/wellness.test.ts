import { describe, expect, it } from 'vitest'
import {
  evaluateFitbitRecoveryAlert,
  getCanonicalWellnessStress
} from '../../../../server/utils/wellness'

describe('evaluateFitbitRecoveryAlert', () => {
  it('triggers alert when fitbit has low HRV, poor sleep, and high ATL', () => {
    const result = evaluateFitbitRecoveryAlert({
      lastSource: 'fitbit',
      hrv: 40,
      sleepHours: 6.1,
      sleepQuality: 68,
      atl: 102,
      recentHrvValues: [52, 50, 49, 51, 53, 50]
    })

    expect(result.isFitbit).toBe(true)
    expect(result.lowHrv).toBe(true)
    expect(result.poorSleep).toBe(true)
    expect(result.highAtl).toBe(true)
    expect(result.triggered).toBe(true)
    expect(result.summary).toContain('FITBIT RECOVERY ALERT')
  })

  it('does not trigger alert for non-fitbit sources', () => {
    const result = evaluateFitbitRecoveryAlert({
      lastSource: 'whoop',
      hrv: 25,
      sleepHours: 5,
      sleepQuality: 60,
      atl: 110,
      recentHrvValues: [50, 50, 50, 50, 50]
    })

    expect(result.isFitbit).toBe(false)
    expect(result.triggered).toBe(false)
    expect(result.summary).toContain('not evaluated')
  })

  it('ignores non-subjective Garmin stress for coach subjective-stress prompts', () => {
    expect(
      getCanonicalWellnessStress({
        stress: 10,
        lastSource: 'garmin',
        rawJson: {
          averageStressLevel: 29
        }
      })
    ).toBeNull()
  })

  it('maps Intervals categorical stress from raw payload into the 1-10 prompt scale', () => {
    expect(
      getCanonicalWellnessStress({
        stress: 10,
        lastSource: 'intervals',
        rawJson: {
          stress: 2
        }
      })
    ).toBe(4)
  })
})
