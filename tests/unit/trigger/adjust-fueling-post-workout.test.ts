import { describe, expect, it } from 'vitest'
import {
  buildBoostedRecoveryWindow,
  calculatePlannedEnergyKj,
  findRecoveryWindowIndex
} from '../../../trigger/adjust-fueling-post-workout'
import type {
  SerializedFuelingPlan,
  SerializedFuelingWindow
} from '../../../server/utils/nutrition-domain'

function planWith(windows: any[]): SerializedFuelingPlan {
  return { windows, dailyTotals: {} as any, notes: [] } as any
}

const MORNING_POST = {
  type: 'POST_WORKOUT',
  windowKey: 'POST_WORKOUT#1',
  startTime: '2026-07-22T08:00:00.000Z',
  endTime: '2026-07-22T09:00:00.000Z',
  plannedWorkoutId: 'am',
  plannedWorkoutIds: ['am'],
  targetCarbs: 40,
  targetProtein: 20
}

const EVENING_POST = {
  type: 'POST_WORKOUT',
  windowKey: 'POST_WORKOUT#2',
  startTime: '2026-07-22T19:00:00.000Z',
  endTime: '2026-07-22T20:00:00.000Z',
  plannedWorkoutId: 'pm',
  plannedWorkoutIds: ['pm'],
  targetCarbs: 60,
  targetProtein: 30
}

describe('findRecoveryWindowIndex', () => {
  it('returns -1 when the day has no recovery window', () => {
    const plan = planWith([{ type: 'DAILY_BASE', startTime: '2026-07-22T12:00:00.000Z' }])
    expect(findRecoveryWindowIndex(plan, { workoutId: 'w', endedAt: new Date() })).toBe(-1)
  })

  it('uses the only recovery window when there is just one', () => {
    const plan = planWith([{ type: 'PRE_WORKOUT' }, MORNING_POST])
    expect(findRecoveryWindowIndex(plan, { workoutId: 'unknown', endedAt: new Date() })).toBe(1)
  })

  it('boosts the window belonging to the session that was completed', () => {
    const plan = planWith([MORNING_POST, EVENING_POST])

    // Finishing the evening session must not boost the morning recovery meal.
    expect(
      findRecoveryWindowIndex(plan, {
        workoutId: 'completed-pm',
        plannedWorkoutId: 'pm',
        endedAt: new Date('2026-07-22T19:00:00.000Z')
      })
    ).toBe(1)

    expect(
      findRecoveryWindowIndex(plan, {
        workoutId: 'completed-am',
        plannedWorkoutId: 'am',
        endedAt: new Date('2026-07-22T08:00:00.000Z')
      })
    ).toBe(0)
  })

  it('matches on the completed workout id when the plan was built from it', () => {
    const plan = planWith([
      MORNING_POST,
      { ...EVENING_POST, plannedWorkoutId: 'completed-pm', plannedWorkoutIds: ['completed-pm'] }
    ])

    expect(
      findRecoveryWindowIndex(plan, {
        workoutId: 'completed-pm',
        plannedWorkoutId: null,
        endedAt: new Date('2026-07-22T19:00:00.000Z')
      })
    ).toBe(1)
  })

  it('falls back to the nearest window when the plan carries no session ids', () => {
    const plan = planWith([
      { ...MORNING_POST, plannedWorkoutId: undefined, plannedWorkoutIds: undefined },
      { ...EVENING_POST, plannedWorkoutId: undefined, plannedWorkoutIds: undefined }
    ])

    expect(
      findRecoveryWindowIndex(plan, {
        workoutId: 'unknown',
        endedAt: new Date('2026-07-22T18:45:00.000Z')
      })
    ).toBe(1)
  })
})

describe('calculatePlannedEnergyKj', () => {
  it('uses the FTP-based formula (watts * IF * seconds / 1000), not duration * IF * 60', () => {
    // A 1-hour endurance ride at FTP 200W and IF 0.65 should cost ~468 kJ, not ~172,800 kJ
    // (the bug produced by the old `durationSec * workIntensity * 60` formula).
    const durationSec = 60 * 60
    const plannedKj = calculatePlannedEnergyKj(200, 0.65, durationSec)

    expect(plannedKj).toBeCloseTo(468, 5)
    expect(plannedKj).toBeLessThan(1000)
  })

  it('scales linearly with FTP, intensity factor, and duration', () => {
    expect(calculatePlannedEnergyKj(250, 1, 1000)).toBeCloseTo(250, 5)
    expect(calculatePlannedEnergyKj(250, 0.5, 1000)).toBeCloseTo(125, 5)
    expect(calculatePlannedEnergyKj(0, 0.65, 3600)).toBe(0)
  })

  it('makes a real hard-effort delta satisfy the 10% "harder than planned" threshold', () => {
    // A rider with FTP 250 doing a planned 90-minute endurance ride (IF 0.65) plans for ~877 kJ.
    // If the actual ride cost 1050 kJ (a genuinely harder effort), the boost should now fire —
    // under the old formula (durationSec * workIntensity * 60) plannedKj would have been ~210,600,
    // making this threshold impossible to clear for any real ride.
    const plannedKj = calculatePlannedEnergyKj(250, 0.65, 90 * 60)
    const actualKj = 1050

    expect(actualKj).toBeGreaterThan(plannedKj * 1.1)
  })
})

describe('buildBoostedRecoveryWindow', () => {
  const baseWindow: SerializedFuelingWindow = {
    type: 'POST_WORKOUT',
    startTime: '2026-07-22T08:00:00.000Z',
    endTime: '2026-07-22T09:00:00.000Z',
    targetCarbs: 40,
    targetProtein: 20,
    targetFat: 10,
    targetFluid: 500,
    targetSodium: 300,
    description: 'Recovery shake with fruit.',
    status: 'PENDING'
  }

  it('increases carb and protein targets by the boost amounts', () => {
    const boosted = buildBoostedRecoveryWindow(baseWindow)

    expect(boosted.targetCarbs).toBe(70)
    expect(boosted.targetProtein).toBe(30)
    expect(boosted.status).toBe('PENDING')
  })

  it('appends the boost note to the always-present description field', () => {
    const boosted = buildBoostedRecoveryWindow(baseWindow)

    expect(boosted.description).toContain('Recovery shake with fruit.')
    expect(boosted.description).toContain('Boosted by +30g carbs')
    expect(boosted.description).not.toContain('undefined')
  })

  it('sets a complete advice sentence rather than concatenating onto an undefined value', () => {
    // The original bug did `${currentWindow.advice} (Boosted ...)` where `advice` was undefined
    // for freshly generated windows (only `description` is populated by the plan generator),
    // producing the literal string "undefined (Boosted ...)".
    expect(baseWindow.advice).toBeUndefined()

    const boosted = buildBoostedRecoveryWindow(baseWindow)

    expect(boosted.advice).toBeDefined()
    expect(boosted.advice).not.toContain('undefined')
    expect(boosted.advice).toContain('Boosted by +30g carbs / +10g protein')
  })

  it('still produces real, non-undefined text when the window already has advice set', () => {
    const windowWithAdvice: SerializedFuelingWindow = {
      ...baseWindow,
      advice: 'Balanced recovery meal to maintain base energy.'
    }

    const boosted = buildBoostedRecoveryWindow(windowWithAdvice)

    expect(boosted.advice).not.toContain('undefined')
    expect(boosted.advice).toContain('Boosted by +30g carbs')
  })
})
