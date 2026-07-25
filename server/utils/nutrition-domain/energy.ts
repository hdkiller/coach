import type { CalorieBreakdown, FuelingProfile } from './types'

/**
 * Energy accounting for a training day.
 *
 * Cycling is costed from power, which is what the rest of the app is built around. Everything else
 * used to be costed the same way - `FTP x IF x duration` - which is meaningless for a treadmill run
 * or a gym session, where the athlete's FTP says nothing about the work performed. Those sports are
 * costed from METs against bodyweight instead.
 */

export type EnergyModel = 'CYCLING' | 'RUN' | 'SWIM' | 'RESISTANCE' | 'LOW_INTENSITY' | 'DEFAULT'

const CYCLING_TYPES = new Set([
  'ride',
  'virtualride',
  'gravelride',
  'mountainbikeride',
  'ebikeride',
  'handcycle',
  'velomobile',
  'cycling',
  'bike'
])

const RUN_TYPES = new Set(['run', 'virtualrun', 'trailrun', 'treadmill', 'running'])
const SWIM_TYPES = new Set(['swim', 'openwaterswim', 'swimming'])
const RESISTANCE_TYPES = new Set([
  'gym',
  'weighttraining',
  'weight training',
  'strength',
  'crossfit'
])
const LOW_INTENSITY_TYPES = new Set([
  'walk',
  'yoga',
  'hike',
  'active recovery',
  'stretching',
  'mobility'
])

/**
 * MET cost as a linear function of intensity: `base + slope * intensity`.
 * Ranges are chosen so an easy session and a hard one land either side of the published
 * compendium values for that activity.
 */
const MET_MODELS: Record<Exclude<EnergyModel, 'CYCLING'>, { base: number; slope: number }> = {
  RUN: { base: 6.5, slope: 8.5 },
  SWIM: { base: 5.0, slope: 6.0 },
  RESISTANCE: { base: 3.0, slope: 4.0 },
  LOW_INTENSITY: { base: 2.5, slope: 2.0 },
  DEFAULT: { base: 5.0, slope: 6.0 }
}

export function getEnergyModel(type?: string | null): EnergyModel {
  const normalized = String(type || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '')

  if (CYCLING_TYPES.has(normalized)) return 'CYCLING'
  if (RUN_TYPES.has(normalized)) return 'RUN'
  if (SWIM_TYPES.has(normalized)) return 'SWIM'

  // The resistance/low-intensity sets carry spaces in some sources, so check both forms.
  const spaced = String(type || '')
    .trim()
    .toLowerCase()
  if (RESISTANCE_TYPES.has(normalized) || RESISTANCE_TYPES.has(spaced)) return 'RESISTANCE'
  if (LOW_INTENSITY_TYPES.has(normalized) || LOW_INTENSITY_TYPES.has(spaced)) {
    return 'LOW_INTENSITY'
  }

  return 'DEFAULT'
}

export function calculateMacroTargetCalories(carbs: number, protein: number, fat: number): number {
  return Math.round(carbs * 4 + protein * 4 + fat * 9)
}

/**
 * Estimates the energy cost of one session when no measured value is available.
 */
export function estimateWorkoutCalories(
  profile: Pick<FuelingProfile, 'ftp' | 'weight'>,
  workout: { type?: string | null; intensity?: number | null; durationHours?: number | null }
): number {
  const durationHours = Number(workout.durationHours || 0)
  if (durationHours <= 0) return 0

  const intensity = Number(workout.intensity) > 0 ? Number(workout.intensity) : 0.65
  const model = getEnergyModel(workout.type)

  if (model === 'CYCLING') {
    // Mechanical work in kJ. At roughly 25% gross efficiency and 4.184 kJ per kcal the two
    // conversions very nearly cancel, so kJ is used directly as kcal - the convention the rest of
    // the app already assumes for cycling.
    const avgPower = (profile.ftp || 250) * intensity
    return Math.round(avgPower * durationHours * 3.6)
  }

  const met = MET_MODELS[model]
  const weight = profile.weight > 0 ? profile.weight : 75
  return Math.round((met.base + met.slope * intensity) * weight * durationHours)
}

export function calculateDailyCalorieBreakdown(
  profile: FuelingProfile,
  workouts: any[]
): CalorieBreakdown {
  const ACTIVITY_MULTIPLIERS: Record<string, number> = {
    SEDENTARY: 1.2,
    LIGHTLY_ACTIVE: 1.375,
    ACTIVE: 1.55,
    MODERATELY_ACTIVE: 1.725,
    VERY_ACTIVE: 1.9,
    EXTRA_ACTIVE: 2.1
  }

  const baseCaloriesMode =
    profile.baseCaloriesMode === 'MANUAL_NON_EXERCISE' ? 'MANUAL_NON_EXERCISE' : 'AUTO'
  const multiplier = ACTIVITY_MULTIPLIERS[profile.activityLevel || 'ACTIVE'] || 1.55
  const autoBaseCalories = Math.round((profile.bmr || 1600) * multiplier)
  const manualBaseCalories = Math.round(profile.nonExerciseBaseCalories || 0)
  const baseCalories =
    baseCaloriesMode === 'MANUAL_NON_EXERCISE' && manualBaseCalories > 0
      ? manualBaseCalories
      : autoBaseCalories

  let activityCalories = 0
  const workoutDetails: CalorieBreakdown['workouts'] = []

  for (const w of workouts) {
    if (w.type !== 'Rest' && w.durationHours > 0) {
      const estimatedCost = estimateWorkoutCalories(profile, w)
      const loggedCalories = Number(w.calories || 0)
      const loggedKilojoules = Number(w.kilojoules || 0)
      const isPlannedOnly = String(w.source || '').toLowerCase() === 'planned'
      const hasActual = !isPlannedOnly && (loggedCalories > 0 || loggedKilojoules > 0)
      const actualCost = loggedCalories > 0 ? loggedCalories : loggedKilojoules
      const cost = Math.round(hasActual ? actualCost : estimatedCost)

      activityCalories += cost
      workoutDetails.push({
        title: w.title || 'Workout',
        calories: cost,
        intensity: w.intensity,
        durationHours: w.durationHours,
        sourceType: hasActual ? 'actual' : 'estimated'
      })
    }
  }

  const subtotalCalories = baseCalories + activityCalories
  const adjustmentCalories = Math.round(
    subtotalCalories * ((profile.targetAdjustmentPercent || 0) / 100)
  )
  const totalTarget = subtotalCalories + adjustmentCalories

  return {
    baseCalories,
    baseCaloriesMode,
    activityCalories,
    adjustmentCalories,
    totalTarget,
    workouts: workoutDetails
  }
}
