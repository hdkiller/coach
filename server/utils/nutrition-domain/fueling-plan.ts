import { buildDayFuelingPlan } from './day-plan'
import type { FuelingProfile, WorkoutContext, SerializedFuelingPlan } from './types'

/**
 * Single-workout fueling strategy.
 *
 * This is a thin view over the day-level builder rather than a second engine: callers that only
 * care about one session (the planned-workout fueling panel, synthetic intake, the CLI) get the
 * same fuel-state rule, sport awareness and per-sitting caps as the day plan.
 *
 * Reconciliation against the daily macro budget is deliberately off here. There are no meal slots
 * in this view, so redistributing the day's whole carbohydrate target would pile it into the
 * pre/post windows and misrepresent what this session alone requires.
 */
export function calculateFuelingStrategy(
  profile: FuelingProfile,
  workout: WorkoutContext
): SerializedFuelingPlan {
  const date = workout.date instanceof Date ? workout.date : new Date(workout.date)

  return buildDayFuelingPlan(profile, [workout as any], {
    date,
    reconcile: false,
    strategyOverride: workout.strategyOverride
  })
}
