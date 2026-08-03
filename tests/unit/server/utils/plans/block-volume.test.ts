import { describe, it, expect } from 'vitest'
import {
  validateGeneratedBlockWeeks,
  clampGeneratedBlockWeeks,
  formatViolationsFeedback,
  weekScheduledMinutes,
  VOLUME_TOLERANCE,
  CLAMP_RATIO,
  MIN_WORKOUT_MINUTES,
  type GeneratedBlockWeek,
  type WeekVolumeTarget
} from '../../../../../server/utils/plans/block-volume'

const ride = (dayOfWeek: number, durationMinutes: number, tssEstimate?: number) => ({
  dayOfWeek,
  title: 'Ride',
  type: 'Ride',
  durationMinutes,
  tssEstimate,
  intensity: 'easy'
})

const target = (
  weekNumber: number,
  volumeTargetMinutes: number | null,
  extra: Partial<WeekVolumeTarget> = {}
): WeekVolumeTarget => ({ weekNumber, volumeTargetMinutes, ...extra })

describe('weekScheduledMinutes', () => {
  it('sums non-rest workout durations', () => {
    const week: GeneratedBlockWeek = {
      weekNumber: 1,
      workouts: [ride(1, 90), ride(3, 60), { dayOfWeek: 2, type: 'Rest', durationMinutes: 0 }]
    }
    expect(weekScheduledMinutes(week, target(1, 480))).toBe(150)
  })

  it('ignores workouts on days outside allowedDaysOfWeek (they are dropped at insert)', () => {
    const week: GeneratedBlockWeek = {
      weekNumber: 1,
      workouts: [ride(1, 90), ride(5, 120)]
    }
    expect(weekScheduledMinutes(week, target(1, 480, { allowedDaysOfWeek: [1, 2, 3] }))).toBe(90)
  })
})

describe('validateGeneratedBlockWeeks', () => {
  it('accepts a week within tolerance of its target', () => {
    const weeks: GeneratedBlockWeek[] = [
      { weekNumber: 1, workouts: [ride(1, 90), ride(3, 90), ride(6, 180)] }
    ]
    expect(validateGeneratedBlockWeeks(weeks, [target(1, 360)])).toEqual([])
  })

  it('flags a week scheduled beyond target * tolerance', () => {
    // Reproduces CW-316: 480min target, ~919min scheduled
    const weeks: GeneratedBlockWeek[] = [
      {
        weekNumber: 1,
        workouts: [
          ride(1, 90),
          ride(2, 180),
          ride(3, 180),
          ride(4, 180),
          ride(5, 180),
          ride(6, 109)
        ]
      }
    ]
    const violations = validateGeneratedBlockWeeks(weeks, [target(1, 480)])
    expect(violations).toHaveLength(1)
    expect(violations[0]).toMatchObject({ weekNumber: 1, kind: 'over_volume' })
  })

  it('mentions recovery in the violation for recovery weeks', () => {
    const weeks: GeneratedBlockWeek[] = [{ weekNumber: 3, workouts: [ride(1, 400), ride(3, 400)] }]
    const violations = validateGeneratedBlockWeeks(weeks, [target(3, 288, { isRecovery: true })])
    expect(violations[0]!.message).toContain('RECOVERY')
  })

  it('flags implausible workout durations', () => {
    // Prod example: 6-minute strength session with TSS 35
    const weeks: GeneratedBlockWeek[] = [
      {
        weekNumber: 1,
        workouts: [{ dayOfWeek: 2, title: 'Strength C', type: 'Gym', durationMinutes: 6 }]
      }
    ]
    const violations = validateGeneratedBlockWeeks(weeks, [target(1, 480)])
    expect(violations).toHaveLength(1)
    expect(violations[0]).toMatchObject({ kind: 'invalid_duration' })
  })

  it('skips weeks without a volume target and unmatched week numbers', () => {
    const weeks: GeneratedBlockWeek[] = [
      { weekNumber: 1, workouts: [ride(1, 400), ride(2, 400), ride(3, 400)] },
      { weekNumber: 9, workouts: [ride(1, 400), ride(2, 400), ride(3, 400)] }
    ]
    expect(validateGeneratedBlockWeeks(weeks, [target(1, 0), target(2, 300)])).toEqual([])
  })

  it('does not count out-of-schedule workouts toward volume', () => {
    const weeks: GeneratedBlockWeek[] = [
      { weekNumber: 1, workouts: [ride(1, 300), ride(5, 300), ride(6, 300)] }
    ]
    // Only Monday is schedulable, so effective volume is 300 <= 360 * 1.2
    expect(
      validateGeneratedBlockWeeks(weeks, [target(1, 360, { allowedDaysOfWeek: [1] })])
    ).toEqual([])
  })
})

describe('clampGeneratedBlockWeeks', () => {
  it('scales an over-volume week down to target * CLAMP_RATIO, durations and TSS together', () => {
    const weeks: GeneratedBlockWeek[] = [
      { weekNumber: 1, workouts: [ride(1, 300, 200), ride(3, 300, 200), ride(6, 300, 200)] }
    ]
    const { weeks: clamped, adjustments } = clampGeneratedBlockWeeks(weeks, [target(1, 450)])

    const total = weekScheduledMinutes(clamped[0]!, target(1, 450))
    expect(total).toBeLessThanOrEqual(450 * VOLUME_TOLERANCE)
    // ~450 * 1.1 = 495, allow rounding slack from 5-minute steps
    expect(total).toBeGreaterThanOrEqual(450 * CLAMP_RATIO * 0.9)
    const w = clamped[0]!.workouts![0]!
    expect(w.tssEstimate).toBeLessThan(200)
    expect(adjustments.length).toBeGreaterThan(0)
  })

  it('clamps implausible durations into bounds', () => {
    const weeks: GeneratedBlockWeek[] = [
      { weekNumber: 1, workouts: [{ dayOfWeek: 2, type: 'Gym', durationMinutes: 6 }] }
    ]
    const { weeks: clamped } = clampGeneratedBlockWeeks(weeks, [target(1, 480)])
    expect(clamped[0]!.workouts![0]!.durationMinutes).toBe(MIN_WORKOUT_MINUTES)
  })

  it('leaves compliant weeks untouched', () => {
    const weeks: GeneratedBlockWeek[] = [{ weekNumber: 1, workouts: [ride(1, 90), ride(3, 90)] }]
    const { weeks: clamped, adjustments } = clampGeneratedBlockWeeks(weeks, [target(1, 300)])
    expect(clamped[0]!.workouts).toEqual(weeks[0]!.workouts)
    expect(adjustments).toEqual([])
  })

  it('does not touch rest days or out-of-schedule workouts when scaling', () => {
    const weeks: GeneratedBlockWeek[] = [
      {
        weekNumber: 1,
        workouts: [
          ride(1, 400),
          ride(2, 400),
          { dayOfWeek: 3, type: 'Rest', durationMinutes: 0 },
          ride(6, 240)
        ]
      }
    ]
    const { weeks: clamped } = clampGeneratedBlockWeeks(weeks, [
      target(1, 300, { allowedDaysOfWeek: [1, 2, 3] })
    ])
    const rest = clamped[0]!.workouts!.find((w) => w.type === 'Rest')!
    const saturday = clamped[0]!.workouts!.find((w) => w.dayOfWeek === 6)!
    expect(rest.durationMinutes).toBe(0)
    expect(saturday.durationMinutes).toBe(240)
  })
})

describe('formatViolationsFeedback', () => {
  it('produces a corrective instruction listing each violation', () => {
    const weeks: GeneratedBlockWeek[] = [{ weekNumber: 1, workouts: [ride(1, 400), ride(2, 400)] }]
    const feedback = formatViolationsFeedback(validateGeneratedBlockWeeks(weeks, [target(1, 300)]))
    expect(feedback).toContain('REJECTED')
    expect(feedback).toContain('Week 1')
    expect(feedback).toContain('windows')
  })
})
