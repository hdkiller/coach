import { describe, expect, it } from 'vitest'
import { findRecoveryWindowIndex } from '../../../trigger/adjust-fueling-post-workout'
import type { SerializedFuelingPlan } from '../../../server/utils/nutrition-domain'

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
