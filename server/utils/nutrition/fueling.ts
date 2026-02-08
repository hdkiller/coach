export interface FuelingProfile {
  weight: number // kg
  ftp: number // watts
  currentCarbMax: number // g/hr
  sodiumTarget?: number // mg/L
  sweatRate?: number // L/hr
  preWorkoutWindow?: number // min (default 90)
  postWorkoutWindow?: number // min (default 60)
}

export interface WorkoutContext {
  id: string
  title: string
  durationSec: number // seconds
  tss?: number | null
  intensityFactor?: number | null
  workIntensity?: number | null // 0-1
  type?: string | null
  startTime?: Date | null
  strategyOverride?: string // e.g. 'TRAIN_LOW', 'HIGH_CARB'
  date: Date
}

export interface SerializedFuelingWindow {
  type: 'PRE_WORKOUT' | 'INTRA_WORKOUT' | 'POST_WORKOUT' | 'general_day'
  startTime: string // ISO string
  endTime: string // ISO string
  targetCarbs: number // grams
  targetProtein: number // grams
  targetFat: number // grams
  targetFluid: number // ml
  targetSodium: number // mg
  description: string
  status: 'PENDING' | 'HIT' | 'MISSED' | 'PARTIAL'
  supplements?: string[]
}

export interface SerializedFuelingPlan {
  windows: SerializedFuelingWindow[]
  dailyTotals: {
    calories: number
    carbs: number
    protein: number
    fat: number
    fluid: number
    sodium: number
  }
  notes: string[]
}

export function calculateFuelingStrategy(
  profile: FuelingProfile,
  workout: WorkoutContext
): SerializedFuelingPlan {
  const durationHours = (workout.durationSec || 0) / 3600
  const intensity = workout.intensityFactor || workout.workIntensity || 0.65

  // Default Windows
  const windows: SerializedFuelingWindow[] = []
  const notes: string[] = []

  // --- 1. INTRA-WORKOUT STRATEGY ---
  let targetCarbsPerHour = 0
  const hydrationPerHour = (profile.sweatRate || 0.8) * 1000 // ml
  const sodiumPerHour = (profile.sodiumTarget || 750) * (profile.sweatRate || 0.8) // mg

  if (workout.strategyOverride === 'TRAIN_LOW') {
    targetCarbsPerHour = 0
    notes.push('TRAIN LOW Protocol: No carb intake during ride to enhance fat oxidation.')
  } else {
    // "Fuel for the Work Required"
    if (durationHours < 1) {
      targetCarbsPerHour = 0 // Short rides don't strictly need carbs if fueled before
      if (intensity > 0.9) targetCarbsPerHour = 30 // Unless it's a crit race
    } else if (durationHours < 2) {
      targetCarbsPerHour = intensity > 0.8 ? 60 : 30
    } else if (durationHours < 3) {
      targetCarbsPerHour = intensity > 0.8 ? 90 : 60
    } else {
      targetCarbsPerHour = 90 // Long rides need max fuel
    }
  }

  // Apply Gut Training Cap
  if (targetCarbsPerHour > profile.currentCarbMax) {
    notes.push(
      `Capping carbs at ${profile.currentCarbMax}g/hr (Gut Training Limit). Goal is ${targetCarbsPerHour}g/hr.`
    )
    targetCarbsPerHour = profile.currentCarbMax
  }

  const intraCarbs = Math.round(targetCarbsPerHour * durationHours)
  const intraFluid = Math.round(hydrationPerHour * durationHours)
  const intraSodium = Math.round(sodiumPerHour * durationHours)

  // Workout Start Time (default to 10am if not set)
  const workoutStart = workout.startTime
    ? new Date(workout.startTime)
    : new Date(workout.date.getTime() + 10 * 60 * 60 * 1000)
  const workoutEnd = new Date(workoutStart.getTime() + workout.durationSec * 1000)

  windows.push({
    type: 'INTRA_WORKOUT',
    startTime: workoutStart.toISOString(),
    endTime: workoutEnd.toISOString(),
    targetCarbs: intraCarbs,
    targetProtein: 0,
    targetFat: 0,
    targetFluid: intraFluid,
    targetSodium: intraSodium,
    description: `Fuel for ${Math.round(durationHours * 10) / 10}h ride at ${(intensity * 100).toFixed(0)}% intensity.`,
    status: 'PENDING',
    supplements: extractSupplements(durationHours, intensity)
  })

  // --- 2. PRE-WORKOUT ---
  // 1-4g/kg carbs 1-4h before -> Simplified to window setting
  const preDuration = profile.preWorkoutWindow || 90
  const preStart = new Date(workoutStart.getTime() - preDuration * 60000)

  let preCarbs = profile.weight * 1.0 // 1g/kg default
  if (workout.strategyOverride === 'TRAIN_LOW') {
    preCarbs = 10 // Minimal carbs
    notes.push('Limit pre-workout carbs to <10g for Train Low effect.')
  } else {
    if (intensity > 0.85 || durationHours > 3) preCarbs = profile.weight * 2.0 // Load up for hard/long
  }

  windows.push({
    type: 'PRE_WORKOUT',
    startTime: preStart.toISOString(),
    endTime: workoutStart.toISOString(),
    targetCarbs: Math.round(preCarbs),
    targetProtein: 20, // Moderate protein
    targetFat: 10, // Low fat to aid digestion
    targetFluid: 500, // Pre-load hydration
    targetSodium: 500, // Pre-load sodium
    description: 'Top off glycogen stores.',
    status: 'PENDING'
  })

  // --- 3. POST-WORKOUT ---
  const postDuration = profile.postWorkoutWindow || 60
  const postEnd = new Date(workoutEnd.getTime() + postDuration * 60000)

  const postCarbs = profile.weight * 1.2 // 1.2g/kg default replenish
  let postProtein = 30 // Standard recovery

  if (workout.strategyOverride === 'TRAIN_LOW') {
    postProtein = 40 // Increase protein to spare muscle
    // Carbs normal replenish, or delayed? Usually immediate replenish is fine after train low unless doing "Sleep Low"
  }

  windows.push({
    type: 'POST_WORKOUT',
    startTime: workoutEnd.toISOString(),
    endTime: postEnd.toISOString(),
    targetCarbs: Math.round(postCarbs),
    targetProtein: postProtein,
    targetFat: 15,
    targetFluid: 500, // Rehydration (estimate)
    targetSodium: 0,
    description: 'Rapid recovery window.',
    status: 'PENDING'
  })

  // Daily Totals (just sum of windows + base metabolic need approximation?)
  // This is "Activity Nutrition", base need calculated separately in total day plan logic usually.
  // simpler to return just window sums here for the "Fueling Plan" specific to workout.

  return {
    windows,
    dailyTotals: {
      calories: (intraCarbs + preCarbs + postCarbs) * 4 + (postProtein + 20) * 4 + 25 * 9,
      carbs: intraCarbs + preCarbs + postCarbs,
      protein: postProtein + 20, // pre + post
      fat: 25, // pre + post
      fluid: intraFluid + 1000,
      sodium: intraSodium + 500
    },
    notes
  }
}

function extractSupplements(duration: number, intensity: number): string[] {
  const supps: string[] = []
  if (intensity > 0.85) supps.push('Caffeine (3-6mg/kg)')
  if (intensity > 0.9 && duration < 0.5) supps.push('Sodium Bicarbonate')
  if (duration > 3) supps.push('Electrolytes')
  return supps
}
