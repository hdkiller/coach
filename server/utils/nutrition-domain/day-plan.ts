import { extractWorkoutTemperatureC, getEstimatedSweatRateLph } from '../nutrition/sweat-rate'
import { calculateDailyCalorieBreakdown, calculateMacroTargetCalories } from './energy'
import type { FuelingProfile, SerializedFuelingPlan, SerializedFuelingWindow } from './types'

/**
 * Day-level fueling window builder.
 *
 * Replaces the previous per-workout strategy calls, which generated a PRE/INTRA/POST triplet for
 * every workout in isolation. On a day with several sessions that produced deeply overlapping
 * windows (five identical "Pre-Workout" cards for three sessions) and window targets that never
 * reconciled against the daily macro targets.
 *
 * The builder instead:
 *   1. clusters workouts into session blocks (gaps shorter than SESSION_MERGE_GAP_MIN),
 *   2. emits one PRE per block, one INTRA per fuelled workout, one POST per block,
 *   3. fills the rest of the day with DAILY_BASE slots from the user's meal pattern,
 *   4. reconciles every macro so the windows sum to the daily target.
 */

/** Two sessions closer than this share a single PRE and POST window. */
export const SESSION_MERGE_GAP_MIN = 45

/** Hard physiological ceiling for carbohydrate in a single sitting (g/kg). */
export const MEAL_CARB_CAP_PER_KG = 2.0

/** Ceiling for protein in a single sitting (g/kg) - above this, absorption is the limit. */
export const MEAL_PROTEIN_CAP_PER_KG = 0.6

/** Intensity values outside this band are treated as bad data and clamped. */
export const MIN_PLAUSIBLE_INTENSITY = 0.3
export const MAX_PLAUSIBLE_INTENSITY = 1.3

export type SportFuelingClass = 'ENDURANCE' | 'RESISTANCE' | 'LOW_INTENSITY'

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

export interface DayWorkoutInput {
  id: string
  title: string
  durationSec: number
  type?: string | null
  source?: string | null
  startTime?: Date | null
  date: Date
  intensityFactor?: number | null
  workIntensity?: number | null
  intensity?: number | null
  tss?: number | null
  calories?: number | null
  kilojoules?: number | null
  strategyOverride?: string
  avgTemp?: number | null
  rawJson?: any
}

export interface MealSlotInput {
  name: string
  /** Absolute time of the slot on the plan day, already resolved in the user's timezone. */
  at: Date
}

export interface DayPlanOptions {
  /** UTC start of the plan day, used to place workouts that have no start time. */
  date: Date
  mealSlots?: MealSlotInput[]
  /** Applied to every carb target (symptom-driven remediation). */
  carbAdjustment?: number
  /** Overrides each workout's own strategy (rescue protocols). */
  strategyOverride?: string
  /**
   * When true (the default) the windows are made to sum exactly to the daily macro targets.
   * Single-workout views turn this off so the windows keep their physiological targets instead of
   * absorbing the whole day's budget.
   */
  reconcile?: boolean
}

interface NormalizedWorkout extends DayWorkoutInput {
  start: Date
  end: Date
  durationHours: number
  normalizedIntensity: number
  sportClass: SportFuelingClass
}

interface SessionBlock {
  workouts: NormalizedWorkout[]
  start: Date
  end: Date
  strategyOverride?: string
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function getSportFuelingClass(type?: string | null): SportFuelingClass {
  const normalized = String(type || '')
    .trim()
    .toLowerCase()
  if (RESISTANCE_TYPES.has(normalized)) return 'RESISTANCE'
  if (LOW_INTENSITY_TYPES.has(normalized)) return 'LOW_INTENSITY'
  return 'ENDURANCE'
}

/**
 * Resolves a usable intensity factor, guarding against the implausible values that arrive from
 * third-party strength/running imports (an 8 minute session tagged 31 TSS implies IF ~1.5).
 */
export function normalizeIntensity(workout: DayWorkoutInput): number {
  const raw = workout.intensityFactor ?? workout.workIntensity ?? workout.intensity

  let intensity = Number(raw)
  if (!Number.isFinite(intensity) || intensity <= 0) intensity = 0.65

  // TSS implies IF: TSS = duration_h * IF^2 * 100. When the declared intensity disagrees wildly
  // with the TSS-implied one on a very short session, trust neither and fall back to a moderate
  // default rather than letting the outlier drive the whole day.
  const durationHours = (workout.durationSec || 0) / 3600
  const tss = Number(workout.tss || 0)
  if (durationHours > 0 && tss > 0) {
    const impliedIntensity = Math.sqrt(tss / (durationHours * 100))
    if (impliedIntensity > MAX_PLAUSIBLE_INTENSITY && intensity > MAX_PLAUSIBLE_INTENSITY) {
      intensity = 0.75
    }
  }

  return clamp(intensity, MIN_PLAUSIBLE_INTENSITY, MAX_PLAUSIBLE_INTENSITY)
}

function resolveWorkoutStart(workout: DayWorkoutInput, dayStart: Date): Date {
  if (workout.startTime instanceof Date && !Number.isNaN(workout.startTime.getTime())) {
    return workout.startTime
  }
  const fromDate = workout.date instanceof Date ? workout.date : new Date(workout.date)
  if (!Number.isNaN(fromDate.getTime())) {
    const hasTime =
      fromDate.getUTCHours() !== 0 ||
      fromDate.getUTCMinutes() !== 0 ||
      fromDate.getUTCSeconds() !== 0
    if (hasTime) return fromDate
  }
  // No usable time: default to mid-morning on the plan day.
  return new Date(dayStart.getTime() + 10 * 60 * 60 * 1000)
}

function normalizeWorkouts(workouts: DayWorkoutInput[], dayStart: Date): NormalizedWorkout[] {
  return workouts
    .filter((w) => w && w.type !== 'Rest' && (w.durationSec || 0) > 0)
    .map((w) => {
      const start = resolveWorkoutStart(w, dayStart)
      const durationHours = (w.durationSec || 0) / 3600
      return {
        ...w,
        start,
        end: new Date(start.getTime() + (w.durationSec || 0) * 1000),
        durationHours,
        normalizedIntensity: normalizeIntensity(w),
        sportClass: getSportFuelingClass(w.type)
      }
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime())
}

/**
 * Groups workouts whose gap is small enough that a single pre-workout meal and a single recovery
 * meal serve all of them. A brick session or a run followed by a gym session is one eating event,
 * not two.
 */
export function clusterIntoSessionBlocks(workouts: NormalizedWorkout[]): SessionBlock[] {
  const blocks: SessionBlock[] = []

  for (const workout of workouts) {
    const current = blocks[blocks.length - 1]
    const gapMin = current ? (workout.start.getTime() - current.end.getTime()) / 60000 : Infinity

    if (current && gapMin <= SESSION_MERGE_GAP_MIN) {
      current.workouts.push(workout)
      current.end = new Date(Math.max(current.end.getTime(), workout.end.getTime()))
      current.strategyOverride = current.strategyOverride || workout.strategyOverride
      continue
    }

    blocks.push({
      workouts: [workout],
      start: workout.start,
      end: workout.end,
      strategyOverride: workout.strategyOverride
    })
  }

  return blocks
}

/**
 * Picks the day's fuel state from the whole day's training rather than the single hardest effort.
 * Intensity is weighted by duration, and long days are promoted on volume alone.
 */
export function resolveDayFuelState(
  profile: FuelingProfile,
  workouts: NormalizedWorkout[]
): { state: number; carbRange: { min: number; max: number } } {
  const carbRanges = {
    1: { min: profile.fuelState1Min || 2.5, max: profile.fuelState1Max || 4.0 },
    2: { min: profile.fuelState2Min || 4.5, max: profile.fuelState2Max || 6.5 },
    3: { min: profile.fuelState3Min || 7.0, max: profile.fuelState3Max || 10.0 }
  }

  const totalHours = workouts.reduce((sum, w) => sum + w.durationHours, 0)
  if (totalHours <= 0) {
    return { state: 1, carbRange: carbRanges[1] }
  }

  // Resistance and low-intensity work carries less glycogen cost per minute than the same
  // duration of endurance work, so it contributes at a discount.
  const intensityWeight = (w: NormalizedWorkout) =>
    w.sportClass === 'ENDURANCE' ? 1 : w.sportClass === 'RESISTANCE' ? 0.7 : 0.4

  const weightedIntensity =
    workouts.reduce(
      (sum, w) => sum + w.normalizedIntensity * w.durationHours * intensityWeight(w),
      0
    ) / totalHours

  let state = 1
  if (weightedIntensity > (profile.fuelState2Trigger || 0.85)) state = 3
  else if (weightedIntensity > (profile.fuelState1Trigger || 0.7)) state = 2

  // Volume floor: a long day is a high-carb day even when it never gets intense.
  const enduranceHours = workouts
    .filter((w) => w.sportClass === 'ENDURANCE')
    .reduce((sum, w) => sum + w.durationHours, 0)
  if (enduranceHours >= 4) state = Math.max(state, 3)
  else if (enduranceHours >= 2.5) state = Math.max(state, 2)

  return { state, carbRange: carbRanges[state as 1 | 2 | 3] }
}

function carbTargetFromRange(
  profile: FuelingProfile,
  carbRange: { min: number; max: number },
  multiplier: number
): number {
  return profile.weight * ((carbRange.min + carbRange.max) / 2) * multiplier
}

/**
 * The day's carbohydrate target, without building the windows.
 *
 * For callers that need to reason about a day the plan has not been generated for yet - the energy
 * projection, for instance - so they do not have to fall back on the lowest fuel state's minimum.
 */
export function estimateDailyCarbTargetGrams(
  profile: FuelingProfile,
  workoutInputs: DayWorkoutInput[],
  options: { date?: Date; carbAdjustment?: number } = {}
): number {
  const dayStart = options.date ? new Date(options.date) : new Date()
  const workouts = normalizeWorkouts(workoutInputs, dayStart)
  const { carbRange } = resolveDayFuelState(profile, workouts)

  const multiplier =
    (profile.fuelingSensitivity || 1.0) *
    (1 + (profile.targetAdjustmentPercent || 0) / 100) *
    (options.carbAdjustment ?? 1)

  return Math.round(carbTargetFromRange(profile, carbRange, multiplier))
}

/**
 * Intra-workout carbohydrate rate. Unlike the previous implementation this is sport aware: you do
 * not drink 75g/h of maltodextrin through a gym session.
 */
export function resolveIntraCarbsPerHour(
  profile: FuelingProfile,
  workout: NormalizedWorkout,
  strategyOverride?: string
): number {
  if (strategyOverride === 'TRAIN_LOW') return 0

  const { durationHours, normalizedIntensity: intensity, sportClass } = workout
  const sensitivity = profile.fuelingSensitivity || 1.0

  let perHour: number

  if (sportClass === 'LOW_INTENSITY') {
    perHour = durationHours >= 2 ? 30 : 0
  } else if (sportClass === 'RESISTANCE') {
    // Only long resistance sessions need in-session carbohydrate at all.
    perHour = durationHours >= 1.5 ? 30 : 0
  } else if (durationHours < 1) {
    perHour = intensity > 0.9 ? 45 : 0
  } else if (durationHours < 2) {
    perHour = intensity > 0.8 ? 75 : 45
  } else {
    perHour = intensity > 0.8 ? 90 : 60
  }

  perHour *= sensitivity

  const effectiveCap = Math.min(90, profile.currentCarbMax || 90)
  if (strategyOverride === 'LOW_FIBER_LIQUID') {
    return Math.min(45, perHour)
  }

  return Math.min(effectiveCap, perHour)
}

function extractSupplements(durationHours: number, intensity: number): string[] {
  const supplements: string[] = []
  if (intensity > 0.85) supplements.push('Caffeine (3-6mg/kg)')
  if (intensity > 0.9 && durationHours < 0.5) supplements.push('Sodium Bicarbonate')
  if (durationHours > 3) supplements.push('Electrolytes')
  return supplements
}

function slugifySlot(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function withKcal(window: SerializedFuelingWindow): SerializedFuelingWindow {
  return {
    ...window,
    targetKcal: calculateMacroTargetCalories(
      window.targetCarbs || 0,
      window.targetProtein || 0,
      window.targetFat || 0
    )
  }
}

/**
 * Builds the complete set of fueling windows for one day, with every macro reconciled against the
 * day's targets.
 */
export function buildDayFuelingPlan(
  profile: FuelingProfile,
  workoutInputs: DayWorkoutInput[],
  options: DayPlanOptions
): SerializedFuelingPlan {
  const dayStart = new Date(options.date)
  const notes: string[] = []
  const workouts = normalizeWorkouts(workoutInputs, dayStart)
  const sensitivity = profile.fuelingSensitivity || 1.0
  const adjustmentMultiplier = 1 + (profile.targetAdjustmentPercent || 0) / 100
  const carbAdjustment = options.carbAdjustment ?? 1

  const mealCarbCap = profile.weight * MEAL_CARB_CAP_PER_KG
  const mealProteinCap = profile.weight * MEAL_PROTEIN_CAP_PER_KG

  // --- 1. DAILY MACRO TARGETS (computed once, from the whole day) ---
  const { state, carbRange } = resolveDayFuelState(profile, workouts)
  const dailyCarbs = Math.round(
    carbTargetFromRange(profile, carbRange, sensitivity * adjustmentMultiplier * carbAdjustment)
  )
  const dailyProtein = Math.round(profile.weight * (profile.baseProteinPerKg || 1.6))
  const dailyFat = Math.round(profile.weight * (profile.baseFatPerKg || 1.0))

  const breakdown = calculateDailyCalorieBreakdown(
    profile,
    workouts.map((w) => ({
      ...w,
      durationHours: w.durationHours,
      intensity: w.normalizedIntensity
    }))
  )

  const baseCaloriesMode =
    profile.baseCaloriesMode === 'MANUAL_NON_EXERCISE' ? 'MANUAL_NON_EXERCISE' : 'AUTO'

  // --- 2. WORKOUT WINDOWS, ONE SET PER SESSION BLOCK ---
  const blocks = clusterIntoSessionBlocks(workouts)
  const workoutWindows: SerializedFuelingWindow[] = []
  let intraFluidTotal = 0
  let intraSodiumTotal = 0

  const preDuration = profile.preWorkoutWindow || 90
  const postDuration = profile.postWorkoutWindow || 60

  blocks.forEach((block, blockIndex) => {
    const strategyOverride = options.strategyOverride || block.strategyOverride
    const ordinal = blockIndex + 1
    const blockHours = block.workouts.reduce((sum, w) => sum + w.durationHours, 0)
    const blockIntensity =
      block.workouts.reduce((sum, w) => sum + w.normalizedIntensity * w.durationHours, 0) /
      (blockHours || 1)
    const isEnduranceBlock = block.workouts.some((w) => w.sportClass === 'ENDURANCE')
    const blockTitle = Array.from(new Set(block.workouts.map((w) => w.title).filter(Boolean))).join(
      ' & '
    )

    // --- PRE ---
    const durationFactor = Math.min(1.0, blockHours / 1.5)
    const intensityMultiplier = blockIntensity < 0.7 ? 0.5 : blockIntensity < 0.85 ? 0.8 : 1.0
    let preCarbs =
      profile.weight *
      Math.max(0.3, durationFactor * intensityMultiplier) *
      sensitivity *
      adjustmentMultiplier
    let preProtein = Math.round(clamp(profile.weight * 0.25, 15, mealProteinCap))
    let preFat = Math.round(clamp(profile.weight * 0.12, 5, 20))
    let preDescription = `Pre-workout fueling for ${blockTitle || 'training'}.`

    if (strategyOverride === 'TRAIN_LOW') {
      preCarbs = 10
      notes.push('TRAIN LOW: Minimal pre-workout carbs (<10g) to maintain low glycogen state.')
    } else if (strategyOverride === 'LOW_FIBER_LIQUID') {
      preCarbs = profile.weight * 0.8
      preProtein = 15
      preFat = 2
      preDescription = 'RESCUE PROTOCOL: Low-fiber, liquid-based pre-workout fueling.'
      notes.push('RESCUE PROTOCOL: Reducing pre-workout fiber and fat to minimize digestive load.')
    } else if (state === 3 || blockHours > 3) {
      preCarbs = profile.weight * 2.0 * sensitivity * adjustmentMultiplier
    }

    workoutWindows.push(
      withKcal({
        type: 'PRE_WORKOUT',
        windowKey: `PRE_WORKOUT#${ordinal}`,
        startTime: new Date(block.start.getTime() - preDuration * 60000).toISOString(),
        endTime: block.start.toISOString(),
        targetCarbs: Math.round(Math.min(mealCarbCap, preCarbs) * carbAdjustment),
        targetProtein: preProtein,
        targetFat: preFat,
        targetFluid: 500,
        targetSodium: 500,
        description: preDescription,
        status: 'PENDING',
        plannedWorkoutId: block.workouts[0]?.id,
        // A block-level window belongs to every session in the block, not just the first. Consumers
        // that filter a day's windows down to one workout need all of them.
        plannedWorkoutIds: block.workouts.map((w) => w.id).filter(Boolean),
        workoutTitle: blockTitle
      } as SerializedFuelingWindow)
    )

    // --- INTRA, one per workout that actually needs fuelling ---
    block.workouts.forEach((workout, workoutIndex) => {
      const perHour = resolveIntraCarbsPerHour(profile, workout, strategyOverride)
      const intraCarbs = Math.round(
        perHour * workout.durationHours * adjustmentMultiplier * carbAdjustment
      )

      const temperatureC = extractWorkoutTemperatureC(workout)
      const sweatRate =
        profile.sweatRate && profile.sweatRate > 0
          ? profile.sweatRate
          : getEstimatedSweatRateLph({
              intensity: workout.normalizedIntensity,
              temperatureC,
              fallback: 0.8
            })
      const intraFluid = Math.round(sweatRate * 1000 * workout.durationHours)
      const intraSodium = Math.round(
        (profile.sodiumTarget || 750) * sweatRate * workout.durationHours
      )

      intraFluidTotal += intraFluid
      intraSodiumTotal += intraSodium

      // A session that needs no carbohydrate does not deserve a window; emitting it anyway is what
      // produced the empty "0g" cards that then counted as critical gaps. Its sweat loss still
      // contributes to the day's fluid target above. Only long endurance sessions keep a zero-carb
      // window, because in-session drinking genuinely needs planning there.
      if (intraCarbs <= 0 && (workout.sportClass !== 'ENDURANCE' || workout.durationHours < 1)) {
        return
      }

      if (perHour > 0 && perHour >= Math.min(90, profile.currentCarbMax || 90)) {
        notes.push(
          `Intra-ride carbs capped at ${Math.round(perHour)}g/hr for ${workout.title || 'training'}.`
        )
      }

      workoutWindows.push(
        withKcal({
          type: 'INTRA_WORKOUT',
          windowKey: `INTRA_WORKOUT#${ordinal}.${workoutIndex + 1}`,
          startTime: workout.start.toISOString(),
          endTime: workout.end.toISOString(),
          targetCarbs: intraCarbs,
          targetProtein: 0,
          targetFat: 0,
          targetFluid: intraFluid,
          targetSodium: intraSodium,
          description: `Fuel State ${state} (${
            state === 1 ? 'Eco' : state === 2 ? 'Steady' : 'Performance'
          }): ${Math.round(workout.durationHours * 10) / 10}h ${workout.title || 'session'}.`,
          status: 'PENDING',
          supplements: extractSupplements(workout.durationHours, workout.normalizedIntensity),
          plannedWorkoutId: workout.id,
          plannedWorkoutIds: workout.id ? [workout.id] : [],
          workoutTitle: workout.title
        } as SerializedFuelingWindow)
      )
    })

    // --- POST ---
    const postBaseMultiplier = 1.2 * durationFactor * intensityMultiplier
    let postCarbs =
      profile.weight *
      Math.max(0.4, postBaseMultiplier) *
      sensitivity *
      adjustmentMultiplier *
      (isEnduranceBlock ? 1 : 0.7)
    let postProtein = Math.round(clamp(profile.weight * 0.4, 25, mealProteinCap))
    let postFat = Math.round(clamp(profile.weight * 0.18, 8, 25))
    let postDescription = `Recovery window after ${blockTitle || 'training'}.`

    if (strategyOverride === 'TRAIN_LOW') {
      postProtein = Math.round(clamp(profile.weight * 0.55, 35, mealProteinCap))
      notes.push('TRAIN LOW: Increased post-workout protein to support muscle repair.')
    } else if (strategyOverride === 'LOW_FIBER_LIQUID') {
      postCarbs = profile.weight * 1.0
      postProtein = 40
      postFat = 5
      postDescription = 'RESCUE PROTOCOL: Rapid-absorption recovery fueling.'
      notes.push('RESCUE PROTOCOL: Focusing on rapid protein and carb absorption with minimal fat.')
    }

    workoutWindows.push(
      withKcal({
        type: 'POST_WORKOUT',
        windowKey: `POST_WORKOUT#${ordinal}`,
        startTime: block.end.toISOString(),
        endTime: new Date(block.end.getTime() + postDuration * 60000).toISOString(),
        targetCarbs: Math.round(Math.min(mealCarbCap, postCarbs) * carbAdjustment),
        targetProtein: postProtein,
        targetFat: postFat,
        targetFluid: 750,
        targetSodium: 0,
        description: postDescription,
        status: 'PENDING',
        plannedWorkoutId: block.workouts[block.workouts.length - 1]?.id,
        plannedWorkoutIds: block.workouts.map((w) => w.id).filter(Boolean),
        workoutTitle: blockTitle
      } as SerializedFuelingWindow)
    )
  })

  // --- 3. DAILY BASE SLOTS ---
  // Meal-pattern slots that fall inside a workout window are already covered by the PRE/POST meal,
  // so they are dropped rather than duplicated.
  const occupiedRanges = workoutWindows.map((w) => ({
    start: new Date(w.startTime).getTime(),
    end: new Date(w.endTime).getTime()
  }))

  const baseWindows: SerializedFuelingWindow[] = (options.mealSlots || [])
    .filter((slot) => slot?.at instanceof Date && !Number.isNaN(slot.at.getTime()))
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .filter((slot) => {
      const at = slot.at.getTime()
      return !occupiedRanges.some((range) => at >= range.start && at < range.end)
    })
    .map((slot) =>
      withKcal({
        type: 'DAILY_BASE',
        windowKey: `DAILY_BASE:${slugifySlot(slot.name)}`,
        slotName: slot.name,
        startTime: slot.at.toISOString(),
        endTime: new Date(slot.at.getTime() + 60 * 60 * 1000).toISOString(),
        targetCarbs: 0,
        targetProtein: 0,
        targetFat: 0,
        targetFluid: 400,
        targetSodium: 0,
        description: `Daily baseline ${slot.name.toLowerCase()}.`,
        status: 'PENDING'
      } as SerializedFuelingWindow)
    )

  // --- 4. RECONCILE MACROS AGAINST DAILY TARGETS ---
  const allWindows = [...workoutWindows, ...baseWindows].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  const reconcile = options.reconcile ?? true

  if (reconcile) {
    distributeCarbs(allWindows, dailyCarbs, mealCarbCap, notes)
    distributeProtein(allWindows, dailyProtein, mealProteinCap)
    distributeFat(allWindows, dailyFat)
  }

  allWindows.forEach((w, index) => {
    Object.assign(w, withKcal(w))
    // Ordinal is only used for display ordering; the stable identity is windowKey.
    ;(w as any).ordinal = index + 1
  })

  // When reconciling, the windows are the day's budget, so report their sums - they are exact by
  // construction. Otherwise report the computed targets, which the windows only partly cover.
  const carbsTotal = reconcile
    ? allWindows.reduce((sum, w) => sum + (w.targetCarbs || 0), 0)
    : dailyCarbs
  const proteinTotal = reconcile
    ? allWindows.reduce((sum, w) => sum + (w.targetProtein || 0), 0)
    : dailyProtein
  const fatTotal = reconcile ? allWindows.reduce((sum, w) => sum + (w.targetFat || 0), 0) : dailyFat

  const macroCalories = calculateMacroTargetCalories(carbsTotal, proteinTotal, fatTotal)

  return {
    windows: allWindows,
    dailyTotals: {
      calories: macroCalories,
      carbs: carbsTotal,
      protein: proteinTotal,
      fat: fatTotal,
      fluid: intraFluidTotal + 2000,
      sodium: intraSodiumTotal + 1000,
      baseCalories: breakdown.baseCalories,
      baseCaloriesMode,
      activityCalories: breakdown.activityCalories,
      adjustmentCalories: breakdown.adjustmentCalories,
      fuelState: state,
      trainingHours: Number(workouts.reduce((sum, w) => sum + w.durationHours, 0).toFixed(3)),
      workoutCalories: breakdown.workouts.map((w) => ({
        title: w.title,
        calories: w.calories,
        sourceType: w.sourceType
      }))
    },
    notes: Array.from(new Set(notes))
  }
}

/**
 * Distributes a budget across slots by water-filling: every slot rises to a common level, except
 * that it never drops below its floor nor rises above the cap. This keeps the day even without
 * letting one surviving meal slot absorb everything the workout windows could not take.
 *
 * Returns whatever could not be placed.
 */
function waterFill(
  slots: { floor: number; cap: number; assign: (value: number) => void }[],
  budget: number
): number {
  if (slots.length === 0) return budget

  const valueAt = (level: number) =>
    slots.reduce((sum, s) => sum + Math.min(s.cap, Math.max(s.floor, level)), 0)

  const maxCap = Math.max(...slots.map((s) => s.cap))

  // Floors alone can exceed the budget on a very light day; scale them back proportionally.
  const floorTotal = valueAt(0)
  if (floorTotal > budget) {
    const scale = floorTotal > 0 ? budget / floorTotal : 0
    slots.forEach((s) => s.assign(Math.min(s.cap, s.floor) * scale))
    return 0
  }

  if (valueAt(maxCap) <= budget) {
    slots.forEach((s) => s.assign(s.cap))
    return budget - valueAt(maxCap)
  }

  let low = 0
  let high = maxCap
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2
    if (valueAt(mid) < budget) low = mid
    else high = mid
  }

  slots.forEach((s) => s.assign(Math.min(s.cap, Math.max(s.floor, high))))
  return 0
}

/**
 * Intra-workout carbohydrate is fixed by physiology, so it is spent first. What remains of the
 * daily target is water-filled across the day's eating windows, using each window's physiological
 * need as its floor and one sitting's worth as its cap.
 */
function distributeCarbs(
  windows: SerializedFuelingWindow[],
  dailyCarbs: number,
  mealCarbCap: number,
  notes: string[]
) {
  const intraWindows = windows.filter((w) => w.type === 'INTRA_WORKOUT')
  const eatingWindows = windows.filter((w) => w.type !== 'INTRA_WORKOUT')

  const intraTotal = intraWindows.reduce((sum, w) => sum + (w.targetCarbs || 0), 0)
  const budget = Math.max(0, dailyCarbs - intraTotal)

  if (eatingWindows.length === 0) {
    if (budget > 0) {
      notes.push(
        `${Math.round(budget)}g of carbohydrate has no eating window on this day; add meal slots in your nutrition settings.`
      )
    }
    return
  }

  const unplaced = waterFill(
    eatingWindows.map((w) => ({
      // PRE/POST arrive carrying their physiological target, which becomes their floor.
      floor: Math.min(mealCarbCap, w.targetCarbs || 0),
      cap: mealCarbCap,
      assign: (value: number) => {
        w.targetCarbs = Math.round(value)
      }
    })),
    budget
  )

  settleDrift(
    eatingWindows,
    budget - unplaced,
    (w) => w.targetCarbs || 0,
    (w, value) => {
      w.targetCarbs = value
    }
  )

  if (unplaced >= 10) {
    notes.push(
      `${Math.round(unplaced)}g of carbohydrate exceeds what your meal slots can absorb. Add a snack slot or split a session.`
    )
  }
}

/**
 * Rounding each window independently drifts the total by a gram or two. Settle the difference on
 * the largest window so the day's windows add up to the stated target exactly.
 */
function settleDrift(
  windows: SerializedFuelingWindow[],
  target: number,
  read: (w: SerializedFuelingWindow) => number,
  write: (w: SerializedFuelingWindow, value: number) => void
) {
  if (windows.length === 0) return
  const assigned = windows.reduce((sum, w) => sum + read(w), 0)
  const drift = target - assigned
  if (drift === 0) return

  const largest = windows.reduce((a, b) => (read(a) >= read(b) ? a : b))
  write(largest, Math.max(0, read(largest) + drift))
}

function distributeProtein(
  windows: SerializedFuelingWindow[],
  dailyProtein: number,
  mealProteinCap: number
) {
  const eatingWindows = windows.filter((w) => w.type !== 'INTRA_WORKOUT')
  if (eatingWindows.length === 0) return

  const anchored = eatingWindows.filter(
    (w) => w.type === 'PRE_WORKOUT' || w.type === 'POST_WORKOUT'
  )
  const anchoredTotal = anchored.reduce((sum, w) => sum + (w.targetProtein || 0), 0)

  // If the workout windows alone already exceed the daily goal, scale them back instead of
  // letting the day overshoot.
  if (anchoredTotal > dailyProtein && anchoredTotal > 0) {
    const scale = dailyProtein / anchoredTotal
    anchored.forEach((w) => {
      w.targetProtein = Math.round((w.targetProtein || 0) * scale)
    })
    windows
      .filter((w) => w.type === 'DAILY_BASE')
      .forEach((w) => {
        w.targetProtein = 0
      })
    settleDrift(
      anchored,
      dailyProtein,
      (w) => w.targetProtein || 0,
      (w, value) => {
        w.targetProtein = value
      }
    )
    return
  }

  const baseWindows = eatingWindows.filter(
    (w) => w.type !== 'PRE_WORKOUT' && w.type !== 'POST_WORKOUT'
  )
  if (baseWindows.length === 0) return

  const remaining = Math.max(0, dailyProtein - anchoredTotal)
  const share = remaining / baseWindows.length
  baseWindows.forEach((w) => {
    w.targetProtein = Math.round(Math.min(mealProteinCap, share))
  })

  settleDrift(
    eatingWindows,
    dailyProtein,
    (w) => w.targetProtein || 0,
    (w, value) => {
      w.targetProtein = value
    }
  )
}

function distributeFat(windows: SerializedFuelingWindow[], dailyFat: number) {
  const eatingWindows = windows.filter((w) => w.type !== 'INTRA_WORKOUT')
  if (eatingWindows.length === 0) return

  const anchored = eatingWindows.filter(
    (w) => w.type === 'PRE_WORKOUT' || w.type === 'POST_WORKOUT'
  )
  const anchoredTotal = anchored.reduce((sum, w) => sum + (w.targetFat || 0), 0)

  if (anchoredTotal > dailyFat && anchoredTotal > 0) {
    const scale = dailyFat / anchoredTotal
    anchored.forEach((w) => {
      w.targetFat = Math.round((w.targetFat || 0) * scale)
    })
    windows
      .filter((w) => w.type === 'DAILY_BASE')
      .forEach((w) => {
        w.targetFat = 0
      })
    settleDrift(
      anchored,
      dailyFat,
      (w) => w.targetFat || 0,
      (w, value) => {
        w.targetFat = value
      }
    )
    return
  }

  const baseWindows = eatingWindows.filter(
    (w) => w.type !== 'PRE_WORKOUT' && w.type !== 'POST_WORKOUT'
  )
  if (baseWindows.length === 0) return

  const share = Math.max(0, dailyFat - anchoredTotal) / baseWindows.length
  baseWindows.forEach((w) => {
    w.targetFat = Math.round(share)
  })

  settleDrift(
    eatingWindows,
    dailyFat,
    (w) => w.targetFat || 0,
    (w, value) => {
      w.targetFat = value
    }
  )
}
