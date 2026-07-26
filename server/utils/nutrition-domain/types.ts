import type { AbsorptionProfile } from './absorption'

export interface GlycogenBreakdown {
  midnightBaseline: number
  replenishment: {
    value: number
    actualCarbs: number
    targetCarbs: number
  }
  depletion: Array<{
    title: string
    value: number
    intensity: number
    durationMin: number
  }>
  restingMetabolism?: number
}

export interface GlycogenResult {
  percentage: number
  advice: string
  state: number
  breakdown: GlycogenBreakdown
}

export interface EnergyPoint {
  time: string
  timestamp: number
  level: number
  kcalBalance: number
  carbBalance: number
  fluidDeficit: number
  isFuture: boolean
  event?: string
  eventType?: 'workout' | 'meal'
  eventIcon?: string
  eventCarbs?: number
  eventFluid?: number
  /**
   * Whether this point's intake is measured, assumed from the plan, or projected forward.
   *
   * Barely one production day in a hundred carries logged food, so most of the curve is inference.
   * Clients must be able to tell the difference rather than present all of it as fact.
   */
  intakeProvenance?: 'logged' | 'assumed' | 'projected'
}

export interface MealContext {
  time: Date
  name: string
  totalCarbs: number
  totalKcal: number
  totalFluid: number
  profile: AbsorptionProfile
  isSynthetic?: boolean
  /** Whether this meal is measured, assumed from the plan, or projected forward. */
  provenance?: 'logged' | 'assumed' | 'projected'
}

export interface WorkoutEvent {
  start: Date
  end: Date
  drainGramsPerInterval: number
  drainKcalPerInterval: number
  drainFluidPerInterval: number
  title: string
}

export interface MetabolicContext {
  userId: string
  date: Date
  timezone: string
  now: Date
}

export interface FuelingProfile {
  weight: number // kg
  ftp: number // watts
  currentCarbMax: number // g/hr
  sodiumTarget?: number // mg/L
  sweatRate?: number // L/hr
  preWorkoutWindow?: number // min (default 90)
  postWorkoutWindow?: number // min (default 60)
  fuelingSensitivity?: number
  fuelState1Trigger?: number
  fuelState1Min?: number
  fuelState1Max?: number
  fuelState2Trigger?: number
  fuelState2Min?: number
  fuelState2Max?: number
  fuelState3Min?: number
  fuelState3Max?: number
  bmr?: number
  activityLevel?: string
  baseCaloriesMode?: 'AUTO' | 'MANUAL_NON_EXERCISE'
  nonExerciseBaseCalories?: number
  targetAdjustmentPercent?: number
  goalProfile?: string
  baseProteinPerKg?: number
  baseFatPerKg?: number
}

export interface CalorieBreakdown {
  baseCalories: number
  baseCaloriesMode: 'AUTO' | 'MANUAL_NON_EXERCISE'
  activityCalories: number
  adjustmentCalories: number
  totalTarget: number
  workouts: {
    title: string
    calories: number
    intensity: number
    durationHours: number
    sourceType?: 'actual' | 'estimated'
  }[]
}

export interface WorkoutContext {
  id: string
  title: string
  durationSec: number // seconds
  tss?: number | null
  intensityFactor?: number | null
  workIntensity?: number | null // 0-1
  intensity?: number | null // legacy fallback from completed workouts
  type?: string | null
  startTime?: Date | null
  strategyOverride?: string // e.g. 'TRAIN_LOW', 'HIGH_CARB'
  date: Date
  avgTemp?: number | null
  rawJson?: any
}

export interface SerializedFuelingWindow {
  type:
    | 'PRE_WORKOUT'
    | 'INTRA_WORKOUT'
    | 'POST_WORKOUT'
    | 'general_day'
    | 'DAILY_BASE'
    | 'TRANSITION'
    | 'WORKOUT_EVENT'
  /**
   * Stable identity for the window within its day, e.g. `PRE_WORKOUT#1` or `DAILY_BASE:breakfast`.
   * Used as the persistence key for planned meals so that several windows of the same type on one
   * day no longer collapse onto a single NutritionPlanMeal row.
   */
  windowKey?: string
  startTime: string // ISO string
  endTime: string // ISO string
  targetCarbs: number // grams
  targetProtein: number // grams
  targetFat: number // grams
  targetFluid: number // ml
  targetSodium: number // mg
  targetKcal?: number // kcal, derived from the macro targets
  description: string
  /** Contextual coaching line shown with the window (carb loading, hydration debt, boosts). */
  advice?: string
  label?: string
  slotName?: string
  status: 'PENDING' | 'HIT' | 'MISSED' | 'PARTIAL'
  supplements?: string[]
  plannedWorkoutId?: string
  /**
   * Every session this window serves. Block-level pre/post windows cover more than one workout, so
   * `plannedWorkoutId` alone cannot answer "does this window belong to workout X".
   */
  plannedWorkoutIds?: string[]
  workoutTitle?: string
  ordinal?: number
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
    baseCalories: number
    baseCaloriesMode?: 'AUTO' | 'MANUAL_NON_EXERCISE'
    activityCalories: number
    adjustmentCalories: number
    fuelState: number
    /**
     * Total planned training time for the day. Carried explicitly because intra-workout windows are
     * only emitted for sessions that need in-session fuel, so they cannot be summed to recover it.
     */
    trainingHours?: number
    workoutCalories?: {
      title: string
      calories: number
      sourceType?: 'actual' | 'estimated'
    }[]
  }
  notes: string[]
}
