import { describe, it, expect } from 'vitest'
import {
  baseWeeklyVolumeMinutes,
  calculateWeekTargets,
  deriveBaseVolumeMinutesFromWeeks,
  isRecoveryWeek,
  DEFAULT_WEEKLY_VOLUME_MINUTES,
  RECOVERY_WEEK_FACTOR
} from '../../../../../server/utils/plans/week-targets'

describe('baseWeeklyVolumeMinutes', () => {
  it('prefers explicit volumeHours over the preference bucket', () => {
    expect(baseWeeklyVolumeMinutes(8, 'LOW')).toBe(480)
    expect(baseWeeklyVolumeMinutes(3.5)).toBe(210)
  })

  it('maps preference buckets and falls back to MID default', () => {
    expect(baseWeeklyVolumeMinutes(null, 'LOW')).toBe(240)
    expect(baseWeeklyVolumeMinutes(null, 'HIGH')).toBe(600)
    expect(baseWeeklyVolumeMinutes(null, 'MID')).toBe(DEFAULT_WEEKLY_VOLUME_MINUTES)
    expect(baseWeeklyVolumeMinutes()).toBe(DEFAULT_WEEKLY_VOLUME_MINUTES)
  })
})

describe('deriveBaseVolumeMinutesFromWeeks', () => {
  it('returns the max non-recovery target (the loading volume)', () => {
    expect(
      deriveBaseVolumeMinutesFromWeeks([
        { volumeTargetMinutes: 480, isRecovery: false },
        { volumeTargetMinutes: 288, isRecovery: true },
        { volumeTargetMinutes: 450, isRecovery: false }
      ])
    ).toBe(480)
  })

  it('returns null when no usable weeks exist', () => {
    expect(deriveBaseVolumeMinutesFromWeeks([])).toBeNull()
    expect(
      deriveBaseVolumeMinutesFromWeeks([
        { volumeTargetMinutes: 0 },
        { isRecovery: true, volumeTargetMinutes: 200 }
      ])
    ).toBeNull()
  })
})

describe('isRecoveryWeek', () => {
  it('marks every Nth week per rhythm', () => {
    expect(isRecoveryWeek(4, 4, 'BASE')).toBe(true)
    expect(isRecoveryWeek(3, 4, 'BASE')).toBe(false)
    expect(isRecoveryWeek(3, 3, 'BUILD')).toBe(true)
  })

  it('never marks recovery inside PEAK/RACE blocks', () => {
    expect(isRecoveryWeek(4, 4, 'PEAK')).toBe(false)
    expect(isRecoveryWeek(4, 4, 'RACE')).toBe(false)
  })
})

describe('calculateWeekTargets', () => {
  it('uses the athlete volume, not the 450min default (CW-318 regression)', () => {
    const result = calculateWeekTargets({
      blockType: 'BUILD',
      weekNumber: 1,
      blockDurationWeeks: 3,
      isRecovery: false,
      baseVolumeMinutes: 480
    })
    expect(result.volumeTargetMinutes).toBe(480)
    expect(result.tssTarget).toBe(400)
  })

  it('falls back to the default when no base volume is known', () => {
    const result = calculateWeekTargets({
      blockType: 'BASE',
      weekNumber: 1,
      blockDurationWeeks: 3,
      isRecovery: false,
      baseVolumeMinutes: null
    })
    expect(result.volumeTargetMinutes).toBe(DEFAULT_WEEKLY_VOLUME_MINUTES)
  })

  it('reduces recovery weeks by the recovery factor', () => {
    const result = calculateWeekTargets({
      blockType: 'BASE',
      weekNumber: 4,
      blockDurationWeeks: 4,
      isRecovery: true,
      baseVolumeMinutes: 480
    })
    expect(result.volumeTargetMinutes).toBe(Math.round(480 * RECOVERY_WEEK_FACTOR))
  })

  it('applies the progressive taper in PEAK blocks', () => {
    const week1 = calculateWeekTargets({
      blockType: 'PEAK',
      weekNumber: 1,
      blockDurationWeeks: 2,
      isRecovery: false,
      baseVolumeMinutes: 480
    })
    const week2 = calculateWeekTargets({
      blockType: 'PEAK',
      weekNumber: 2,
      blockDurationWeeks: 2,
      isRecovery: false,
      baseVolumeMinutes: 480
    })
    expect(week1.volumeTargetMinutes).toBe(360) // 75%
    expect(week2.volumeTargetMinutes).toBe(240) // 50%
    expect(week2.volumeTargetMinutes).toBeLessThan(week1.volumeTargetMinutes)
  })
})
