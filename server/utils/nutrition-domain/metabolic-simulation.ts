import { differenceInMinutes } from 'date-fns'
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz'
import {
  ABSORPTION_PROFILES,
  getAbsorbedInInterval,
  getProfileForItem,
  type AbsorptionType
} from './absorption'
import { getWorkoutDate } from './workout'
import type { GlycogenResult, EnergyPoint, GlycogenBreakdown, WorkoutEvent } from './types'
import {
  PASSIVE_REHYDRATION_END_HOUR,
  PASSIVE_REHYDRATION_ML_PER_HOUR,
  PASSIVE_REHYDRATION_START_HOUR,
  NO_EXERCISE_DEBT_DECAY_ML_PER_HOUR
} from '../nutrition/hydration'
import { extractWorkoutTemperatureC, getEstimatedSweatRateLph } from '../nutrition/sweat-rate'
import { pickMealScheduledTime } from '../nutrition/meal-pattern'
import { getSportFuelingClass, type SportFuelingClass } from './day-plan'

/**
 * Retained at 1 so the drain has a single source of truth.
 *
 * A flat 1.25 used to sit on top of an already-calibrated table, applied to carbohydrate but not to
 * calories. The uplift is now folded into the anchors below, where it can be reasoned about.
 */
export const WORKOUT_DRAIN_MULTIPLIER = 1

/**
 * The glycogen level a day should hand to the next one.
 *
 * A day with no intake information is uninformative, not evidence of depletion: the simulation
 * drains it with nothing going in, so trusting that ending would compound a fictional deficit
 * across every unlogged day. Such days are floored at the metabolic baseline. Days that do carry
 * intake data are handed on exactly as simulated, including an honest zero.
 */
export function carryForwardGlycogen(
  endLevel: number,
  dayHadIntakeData: boolean,
  metabolicFloor?: number | null
): number {
  const level = Number.isFinite(endLevel) ? endLevel : 0
  if (dayHadIntakeData) return level

  const floor = Number.isFinite(metabolicFloor as number) ? Number(metabolicFloor) : 0.6
  return Math.max(level, floor * 100)
}

/**
 * Total glycogen capacity in grams.
 *
 * Glycogen is stored in muscle and liver, so capacity tracks lean mass. Scaling on bodyweight - the
 * previous behaviour - flatters heavier, less lean athletes: at 8 g/kg a 100kg rider at 30% body fat
 * was credited 800g, well beyond what their muscle mass can hold.
 *
 * Lean mass is used whenever body composition is known. Without it the bodyweight basis is kept, so
 * athletes who have never logged body fat see no change.
 */
export const GLYCOGEN_G_PER_KG_BODYWEIGHT = 8
export const GLYCOGEN_G_PER_KG_LEAN_MASS = 9
export const MIN_GLYCOGEN_CAPACITY_G = 100

export function resolveGlycogenCapacityG(settings: any): number {
  const weight = Number(settings?.weight || settings?.user?.weight || 75)

  const explicitLeanMass = Number(settings?.leanMassKg)
  const bodyFatPercent = Number(settings?.bodyFatPercent)

  let capacity: number
  if (Number.isFinite(explicitLeanMass) && explicitLeanMass > 0) {
    capacity = explicitLeanMass * GLYCOGEN_G_PER_KG_LEAN_MASS
  } else if (Number.isFinite(bodyFatPercent) && bodyFatPercent > 0 && bodyFatPercent < 60) {
    capacity = weight * (1 - bodyFatPercent / 100) * GLYCOGEN_G_PER_KG_LEAN_MASS
  } else {
    capacity = weight * GLYCOGEN_G_PER_KG_BODYWEIGHT
  }

  return Math.max(MIN_GLYCOGEN_CAPACITY_G, capacity)
}

/** Bounds on how far an unlogged day's assumed intake may be scaled from the plan's target. */
export const MIN_ASSUMED_INTAKE_SCALE = 0.3
export const MAX_ASSUMED_INTAKE_SCALE = 1.25

/** Gut absorption ceiling per 15 minute interval (~90g/hr). */
export const INTERVAL_CARB_ABSORPTION_CAP_G = 22.5

/**
 * Where a meal in the simulation came from.
 *
 * `logged` is measured. `assumed` is the plan's target for a slot that has passed with nothing
 * logged. `projected` is the plan's target for a slot still to come. Only the first is evidence.
 */
export type MealProvenance = 'logged' | 'assumed' | 'projected'

/** Sedentary uplift applied to BMR for everyday non-training movement. */
export const RESTING_ACTIVITY_FACTOR = 1.2

/**
 * Share of resting energy expenditure drawn from the glycogen tank.
 *
 * Not the same as the carbohydrate share of resting substrate oxidation: muscle has no
 * glucose-6-phosphatase, so most resting carbohydrate use is fed by blood glucose from the liver
 * and by gluconeogenesis rather than by emptying the muscle store this model tracks.
 *
 * One third of `BMR x RESTING_ACTIVITY_FACTOR` reproduces the previous figure (40% of bare BMR)
 * exactly, so the carbohydrate and calorie drains now derive from one daily number without moving
 * any athlete's curve.
 */
export const GLYCOGEN_SHARE_OF_RESTING_ENERGY = 1 / 3

/**
 * Glycogen cost per minute at a given intensity, in grams, before the sport weighting.
 *
 * Interpolated between three anchors rather than stepped between bands: the old table jumped by
 * two thirds across a hundredth of a point at 0.9, which is not a distinction an imported intensity
 * estimate can support.
 *
 * Each anchor sits at the midpoint of one of the old bands, carrying that band's effective rate
 * (its value times the 1.25 uplift that used to be applied separately). Anchoring at midpoints
 * rather than edges keeps the curve convex, which is how carbohydrate oxidation actually behaves,
 * and avoids the interpolation running away between widely spaced anchors.
 *
 * The top anchor is deliberately below what that arithmetic gives: 4.5 g/min is already at the
 * ceiling of measured whole-body carbohydrate oxidation, and the previous effective 5.6 g/min asked
 * the athlete to burn glycogen faster than it can be oxidised.
 */
const DRAIN_ANCHORS: Array<{ intensity: number; gramsPerMin: number }> = [
  { intensity: 0.5, gramsPerMin: 0.94 },
  { intensity: 0.675, gramsPerMin: 1.88 },
  { intensity: 0.825, gramsPerMin: 3.44 },
  { intensity: 0.95, gramsPerMin: 4.5 }
]

/**
 * How much of the tabulated drain a sport actually costs.
 *
 * Mirrors the weights the fueling plan already uses: resistance work is mostly short efforts
 * separated by rest, so its glycogen turnover per elapsed minute is well below an hour of
 * continuous endurance work at the same nominal intensity.
 */
const SPORT_DRAIN_WEIGHTS: Record<SportFuelingClass, number> = {
  ENDURANCE: 1,
  RESISTANCE: 0.7,
  LOW_INTENSITY: 0.4
}

export function getGramsPerMin(
  intensity: number,
  sportClass: SportFuelingClass = 'ENDURANCE'
): number {
  const first = DRAIN_ANCHORS[0]!
  const last = DRAIN_ANCHORS[DRAIN_ANCHORS.length - 1]!

  let base: number
  if (!Number.isFinite(intensity) || intensity <= first.intensity) {
    base = first.gramsPerMin
  } else if (intensity >= last.intensity) {
    base = last.gramsPerMin
  } else {
    const upperIndex = DRAIN_ANCHORS.findIndex((anchor) => anchor.intensity > intensity)
    const upper = DRAIN_ANCHORS[upperIndex]!
    const lower = DRAIN_ANCHORS[upperIndex - 1]!
    const span = upper.intensity - lower.intensity
    const ratio = span > 0 ? (intensity - lower.intensity) / span : 0
    base = lower.gramsPerMin + (upper.gramsPerMin - lower.gramsPerMin) * ratio
  }

  return base * (SPORT_DRAIN_WEIGHTS[sportClass] ?? 1)
}

function getDateStr(date: any): string {
  if (date instanceof Date) {
    return date.toISOString().split('T')[0]!
  }
  if (typeof date === 'string') {
    return date.split('T')[0]!
  }
  return new Date().toISOString().split('T')[0]!
}

export function parseMealDateTime(
  timeVal: unknown,
  dateStr: string,
  timezone: string
): Date | null {
  if (!timeVal) return null

  if (typeof timeVal === 'string') {
    if (/^\d{1,2}:\d{2}$/.test(timeVal)) {
      return fromZonedTime(`${dateStr}T${timeVal}:00`, timezone)
    }

    const timeOnlyMatch = timeVal.match(/^(\d{2}:\d{2}(:\d{2})?)$/)
    if (timeOnlyMatch) {
      return fromZonedTime(`${dateStr}T${timeOnlyMatch[1]}`, timezone)
    }

    // Naive local datetime (common in external logs like Yazio): interpret in user timezone.
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(timeVal)) {
      return fromZonedTime(timeVal.replace(' ', 'T'), timezone)
    }

    // Date-only values carry no time semantics. Return null so callers can apply
    // meal-pattern fallback times (Breakfast/Lunch/Dinner/Snacks).
    if (/^\d{4}-\d{2}-\d{2}$/.test(timeVal)) {
      return null
    }
  }

  const parsed = new Date(timeVal as any)
  return isNaN(parsed.getTime()) ? null : parsed
}

export function getConfiguredMealTime(mealType: string, settings: any): string | null {
  const normalized = String(mealType || '')
    .trim()
    .toLowerCase()

  if (!['breakfast', 'lunch', 'dinner', 'snacks'].includes(normalized)) {
    return null
  }

  return pickMealScheduledTime(
    normalized as 'breakfast' | 'lunch' | 'dinner' | 'snacks',
    settings?.mealPattern
  )
}

export function calculateGlycogenState(
  nutritionRecord: any,
  workouts: any[],
  settings: any,
  timezone: string,
  currentTime: Date = new Date(),
  startingPercentage?: number
): GlycogenResult {
  const C_cap = resolveGlycogenCapacityG(settings)

  const metabolicFloor = settings?.metabolicFloor || 0.6
  const baselinePct = startingPercentage !== undefined ? startingPercentage : metabolicFloor * 100
  let currentGrams = C_cap * (baselinePct / 100)

  const targetCarbs = nutritionRecord.carbsGoal || 300

  let absorbedUntilNow = 0
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snacks']
  const dateStr = getDateStr(nutritionRecord.date)

  mealTypes.forEach((type) => {
    if (Array.isArray(nutritionRecord[type])) {
      nutritionRecord[type].forEach((item: any) => {
        const timeVal = item.logged_at || item.date
        let mealTime = parseMealDateTime(timeVal, dateStr, timezone)

        if (!mealTime) {
          const configuredTime = getConfiguredMealTime(type, settings)
          if (configuredTime) {
            mealTime = parseMealDateTime(configuredTime, dateStr, timezone)
          }
        }

        if (mealTime && mealTime <= currentTime) {
          const minsSince = differenceInMinutes(currentTime, mealTime)
          const profile = item.absorptionType
            ? ABSORPTION_PROFILES[item.absorptionType as AbsorptionType] ||
              getProfileForItem(item.name || item.product_name || '')
            : getProfileForItem(item.name || item.product_name || '')

          const absorbed = getAbsorbedInInterval(0, minsSince, item.carbs || 0, profile)
          absorbedUntilNow += absorbed
        }
      })
    }
  })

  const hasGranularLogs = mealTypes.some(
    (t) => Array.isArray(nutritionRecord[t]) && nutritionRecord[t].length > 0
  )
  const actualCarbs = hasGranularLogs ? absorbedUntilNow : nutritionRecord.carbs || 0

  currentGrams += actualCarbs

  const replenishmentPct = (actualCarbs / C_cap) * 100

  const dayStart = fromZonedTime(`${dateStr}T00:00:00`, timezone)
  const minsSinceMidnight = differenceInMinutes(currentTime, dayStart)
  const dailyBmr = settings?.bmr || 1600
  const restingDailyKcal = dailyBmr * RESTING_ACTIVITY_FACTOR
  const gramsDrainedBmr =
    ((restingDailyKcal * GLYCOGEN_SHARE_OF_RESTING_ENERGY) / 4) * (minsSinceMidnight / 1440)

  currentGrams -= gramsDrainedBmr

  const bmrPctDrop = (gramsDrainedBmr / C_cap) * 100

  const depletionEvents: GlycogenBreakdown['depletion'] = []
  let totalDepletionGrams = 0

  workouts.forEach((workout) => {
    if (workout.type === 'Rest') return

    const workoutStart = new Date(getWorkoutDate(workout, timezone))
    const isCompleted = workout.source === 'completed' || workout.completed === true

    const intensity = workout.intensity || workout.workIntensity || 0.7
    const durationMin =
      (workout.duration || workout.durationSec || workout.plannedDuration || 3600) / 60

    const gramsPerMin =
      getGramsPerMin(intensity, getSportFuelingClass(workout.type)) * WORKOUT_DRAIN_MULTIPLIER
    const drainGramsTotal = gramsPerMin * durationMin
    const drainAmountPct = (drainGramsTotal / C_cap) * 100

    if (isCompleted) {
      totalDepletionGrams += drainGramsTotal
      depletionEvents.push({
        title: workout.title,
        value: Math.round(drainAmountPct),
        intensity,
        durationMin: Math.round(durationMin)
      })
    } else if (workoutStart <= currentTime) {
      const minsElapsed = Math.max(0, differenceInMinutes(currentTime, workoutStart))
      const effectiveMins = Math.min(durationMin, minsElapsed)
      const partialDrain = gramsPerMin * effectiveMins

      if (partialDrain > 0) {
        totalDepletionGrams += partialDrain
        depletionEvents.push({
          title: workout.title,
          value: Math.round((partialDrain / C_cap) * 100),
          intensity,
          durationMin: Math.round(effectiveMins)
        })
      }
    }
  })

  currentGrams -= totalDepletionGrams
  currentGrams = Math.max(0, Math.min(C_cap, currentGrams))

  const percentage = Math.round((currentGrams / C_cap) * 100)

  let advice: string
  let state: number

  if (percentage > 70) {
    advice = 'Energy levels high. Ready for intensity.'
    state = 1
  } else if (percentage > 35) {
    advice = 'Moderate depletion. Focus on replenishment.'
    state = 2
  } else {
    advice = 'Low fuel. Prioritize carbohydrate intake soon to support your next effort.'
    state = 3
  }

  return {
    percentage,
    advice,
    state,
    breakdown: {
      midnightBaseline: baselinePct,
      replenishment: {
        value: Math.round(replenishmentPct),
        actualCarbs,
        targetCarbs
      },
      depletion: depletionEvents,
      restingMetabolism: Math.round(bmrPctDrop)
    }
  }
}

export function calculateEnergyTimeline(
  nutritionRecord: any,
  workouts: any[],
  settings: any,
  timezone: string,
  ghostMeal?: any,
  options: {
    startingGlycogenPercentage?: number
    startingFluidDeficit?: number
    crossDayMeals?: any[]
    now?: Date
  } = {}
): EnergyPoint[] {
  const dateStr = getDateStr(nutritionRecord.date)
  const dayStart = fromZonedTime(`${dateStr}T00:00:00`, timezone)
  const now = options.now || new Date()

  const points: EnergyPoint[] = []
  const INTERVAL = 15
  const TOTAL_POINTS = (24 * 60) / INTERVAL

  const weight = settings?.weight || settings?.user?.weight || 75
  const C_cap = resolveGlycogenCapacityG(settings)
  const metabolicFloor = settings?.metabolicFloor || 0.6

  const effectiveCarbsGoal =
    nutritionRecord.carbsGoal || (settings?.fuelState1Min ? settings.fuelState1Min * weight : 300)

  // The metabolic floor is a default for days the chain knows nothing about, not a correction to
  // apply to a value it does know. It used to be forced on any starting value at or below zero,
  // which meant a day that genuinely ended empty began the next morning at 60% - inventing most of
  // a tank overnight and putting a 60 point step in a line that is supposed to be continuous.
  //
  // A day that ended empty now starts empty. That reads as an athlete digging a hole, which is the
  // signal worth showing; a chain that is actually broken supplies no starting value at all and
  // still gets the floor.
  const hasKnownStart =
    options.startingGlycogenPercentage !== undefined &&
    Number.isFinite(options.startingGlycogenPercentage)

  const startingPct = hasKnownStart
    ? Math.max(0, options.startingGlycogenPercentage as number)
    : metabolicFloor * 100

  let currentGrams = C_cap * (startingPct / 100)
  let currentFluidDeficit = options.startingFluidDeficit || 0

  let cumulativeKcalDelta = 0
  let cumulativeCarbDelta = 0

  const dailyBmr = settings?.bmr || 1600
  // Both lines derive from the same daily resting figure. They used to disagree: grams came off
  // bare BMR while calories came off BMR x 1.2, so the two balances drifted apart over a rest day.
  const restingDailyKcal = dailyBmr * RESTING_ACTIVITY_FACTOR
  const intervalRestDrainGrams = (restingDailyKcal * GLYCOGEN_SHARE_OF_RESTING_ENERGY) / (4 * 96)
  const intervalRestDrainKcal = restingDailyKcal / 96
  const intervalRestFluidLoss = 50 / 96

  const actualMeals: any[] = []
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snacks']

  if (options.crossDayMeals) {
    actualMeals.push(...options.crossDayMeals)
  }

  mealTypes.forEach((type) => {
    if (Array.isArray(nutritionRecord[type]) && nutritionRecord[type].length > 0) {
      nutritionRecord[type].forEach((item: any) => {
        const timeVal = item.logged_at || item.date

        let mealTime = parseMealDateTime(timeVal, dateStr, timezone)

        if (!mealTime) {
          const configuredTime = getConfiguredMealTime(type, settings)
          if (configuredTime) {
            mealTime = parseMealDateTime(configuredTime, dateStr, timezone)
          }
        }

        if (mealTime && !isNaN(mealTime.getTime())) {
          actualMeals.push({
            time: mealTime,
            name: item.name || item.product_name,
            totalCarbs: item.carbs || 0,
            totalKcal:
              item.calories ||
              (item.carbs || 0) * 4 + (item.protein || 0) * 4 + (item.fat || 0) * 9,
            totalFluid: item.fluidMl || item.waterMl || 0,
            profile: item.absorptionType
              ? ABSORPTION_PROFILES[item.absorptionType as AbsorptionType] ||
                getProfileForItem(item.name || item.product_name || '')
              : getProfileForItem(item.name || item.product_name || '')
          })
        }
      })
    }
  })

  const finalMeals = [...actualMeals]
  const todayStr = formatInTimeZone(now, timezone, 'yyyy-MM-dd')
  const isFutureDay = dateStr > todayStr

  const syntheticCandidates: any[] = []

  if (nutritionRecord.fuelingPlan?.windows) {
    nutritionRecord.fuelingPlan.windows.forEach((window: any) => {
      if (window.targetCarbs > 0) {
        syntheticCandidates.push({
          time: new Date(window.startTime),
          name: window.type,
          type: window.type,
          targetCarbs: window.targetCarbs,
          targetFluid: window.targetFluid,
          profile:
            window.type === 'INTRA_WORKOUT'
              ? ABSORPTION_PROFILES.RAPID
              : ABSORPTION_PROFILES.BALANCED
        })
      }
    })
  }

  // The fueling plan now carries its own DAILY_BASE windows. Only fall back to synthesizing them
  // from the meal pattern when the plan has none, otherwise every baseline meal is counted twice.
  const planHasBaseWindows = syntheticCandidates.some((c) => c.type === 'DAILY_BASE')

  if (effectiveCarbsGoal > 0 && !planHasBaseWindows) {
    const pattern =
      settings?.mealPattern && settings.mealPattern.length > 0
        ? settings.mealPattern
        : [
            { name: 'Breakfast', time: '08:00' },
            { name: 'Lunch', time: '13:00' },
            { name: 'Dinner', time: '19:00' }
          ]

    const baselineCarbPerMeal = effectiveCarbsGoal / pattern.length

    pattern.forEach((p: any) => {
      syntheticCandidates.push({
        time: fromZonedTime(`${dateStr}T${p.time}:00`, timezone),
        name: p.name,
        type: 'DAILY_BASE',
        targetCarbs: baselineCarbPerMeal,
        targetFluid: 0,
        profile: ABSORPTION_PROFILES.BALANCED
      })
    })
  }

  // What a day with no logged food should assume the athlete ate.
  //
  // Assuming the plan's full target says "you finished every day topped up", which pins the tank
  // full and tells the athlete nothing. Assuming nothing says "you fasted", which empties it and
  // tells them nothing either. Absence of evidence should mean absence of movement: an unlogged day
  // is modelled as energy balance, so the level ends where it began and only training moves it.
  const restingDrainGramsPerDay =
    (dailyBmr * RESTING_ACTIVITY_FACTOR * GLYCOGEN_SHARE_OF_RESTING_ENERGY) / 4
  const workoutDrainGrams = workouts
    .filter((w: any) => w.type !== 'Rest')
    .reduce((sum: number, w: any) => {
      const durationMin = (w.durationSec || w.duration || w.plannedDuration || 3600) / 60
      const intensity = w.workIntensity || w.intensityFactor || w.intensity || 0.7
      return (
        sum +
        getGramsPerMin(intensity, getSportFuelingClass(w.type)) *
          WORKOUT_DRAIN_MULTIPLIER *
          durationMin
      )
    }, 0)

  const dayExpenditureGrams = restingDrainGramsPerDay + workoutDrainGrams
  const assumedIntakeScale =
    effectiveCarbsGoal > 0
      ? Math.min(
          MAX_ASSUMED_INTAKE_SCALE,
          Math.max(MIN_ASSUMED_INTAKE_SCALE, dayExpenditureGrams / effectiveCarbsGoal)
        )
      : 1

  const sortedCandidates = syntheticCandidates.sort((a, b) => a.time.getTime() - b.time.getTime())

  sortedCandidates.forEach((cand: any, idx: number) => {
    const windowStartTime = cand.time
    const hasPassed = windowStartTime < now

    const hasRealLog = actualMeals.some(
      (m) => Math.abs(m.time.getTime() - windowStartTime.getTime()) < 2 * 60 * 60 * 1000
    )

    const hasBetterSynthetic = sortedCandidates.some(
      (other) =>
        other !== cand &&
        other.type !== 'DAILY_BASE' &&
        cand.type === 'DAILY_BASE' &&
        Math.abs(other.time.getTime() - windowStartTime.getTime()) < 2 * 60 * 60 * 1000
    )

    if (!hasRealLog && !hasBetterSynthetic) {
      // A slot that has not arrived yet is a projection of the plan. A slot that has passed with
      // nothing logged is an assumption that the plan was followed.
      //
      // It used to be neither: past unlogged slots contributed no intake at all, which modelled the
      // athlete as having fasted. Against production that emptied the tank on half of all training
      // days, because barely one day in a hundred carries logged food. An assumption stated as an
      // assumption is far more useful than a starvation curve presented as fact.
      const isProjected = isFutureDay || !hasPassed
      const provenance: MealProvenance = isProjected ? 'projected' : 'assumed'

      // Projected slots carry the plan as recommended; assumed slots are scaled to the day's
      // expenditure so an unlogged day neither fills nor empties the tank.
      let mealCarbs = isProjected ? cand.targetCarbs : cand.targetCarbs * assumedIntakeScale
      const currentTankPct = (currentGrams / C_cap) * 100

      // Front-loading is planning advice - "you are low, eat early" - so it only applies to slots
      // still ahead of the athlete. Applying it retrospectively would invent intake beyond the plan.
      if (isProjected && idx === 0 && currentTankPct < 40) {
        const gramsTo80 = C_cap * 0.8 - currentGrams
        if (mealCarbs < gramsTo80) {
          mealCarbs = gramsTo80
        }
      } else if (isProjected && idx === 0 && currentTankPct < 85) {
        const gramsTo85 = C_cap * 0.85 - currentGrams
        const maxFrontLoad = effectiveCarbsGoal * 0.6
        const recoveryBonus = Math.min(gramsTo85, maxFrontLoad - mealCarbs)
        if (recoveryBonus > 0) mealCarbs += recoveryBonus
      }

      finalMeals.push({
        time: windowStartTime,
        name: `${isProjected ? 'Planned' : 'Assumed'} ${cand.name}`,
        totalCarbs: mealCarbs,
        totalKcal: mealCarbs * 4,
        totalFluid: (cand.targetFluid || 0) * (isProjected ? 1 : assumedIntakeScale),
        profile: cand.profile,
        isSynthetic: true,
        provenance
      })
    }
  })

  if (
    nutritionRecord.waterMl &&
    finalMeals.reduce((acc, m) => acc + (m.totalFluid || 0), 0) === 0
  ) {
    finalMeals.push({
      time: dayStart,
      name: 'Hydration',
      totalCarbs: 0,
      totalKcal: 0,
      totalFluid: nutritionRecord.waterMl,
      profile: ABSORPTION_PROFILES.RAPID
    })
  }

  if (ghostMeal) {
    // A hypothetical "what if I ate this" meal is a projection, never evidence.
    finalMeals.push({
      ...ghostMeal,
      totalFluid: 0,
      name: 'Ghost Recommendation',
      isSynthetic: true,
      provenance: 'projected' as MealProvenance
    })
  }

  // Derived from the meals themselves rather than from whether the date is in the future: today is
  // half elapsed, so a day whose remaining slots are projected but whose morning went unlogged is
  // partly assumed, and saying otherwise would overstate what is known.
  const hasLoggedIntake = finalMeals.some((meal: any) => !meal.isSynthetic)
  const hasAssumedIntake = finalMeals.some((meal: any) => meal.provenance === 'assumed')
  const dayIntakeProvenance: MealProvenance = hasLoggedIntake
    ? 'logged'
    : hasAssumedIntake
      ? 'assumed'
      : 'projected'

  const workoutEvents: WorkoutEvent[] = workouts
    .filter((w) => w.type !== 'Rest')
    .map((w) => {
      const start = new Date(getWorkoutDate(w, timezone))
      const durationSec = w.durationSec || w.duration || w.plannedDuration || 3600
      const durationMin = durationSec / 60
      const intensity = w.workIntensity || w.intensityFactor || w.intensity || 0.7
      const sweatRateLph =
        settings.sweatRate && settings.sweatRate > 0
          ? settings.sweatRate
          : getEstimatedSweatRateLph({
              intensity,
              temperatureC: extractWorkoutTemperatureC(w),
              fallback: 0.8
            })

      return {
        start,
        end: new Date(start.getTime() + durationMin * 60000),
        drainGramsPerInterval: getGramsPerMin(intensity, getSportFuelingClass(w.type)) * INTERVAL,
        drainKcalPerInterval:
          ((getGramsPerMin(intensity, getSportFuelingClass(w.type)) * 4) / 0.8) * INTERVAL,
        drainFluidPerInterval: sweatRateLph * 1000 * (INTERVAL / 60),
        title: w.title
      }
    })

  const manualFluidHours = new Set(
    finalMeals
      .filter((meal) => !meal.isSynthetic && (meal.totalFluid || 0) > 0)
      .map((meal) => formatInTimeZone(meal.time, timezone, 'yyyy-MM-dd-HH'))
  )

  for (let i = 0; i <= TOTAL_POINTS; i++) {
    const currentTime = new Date(dayStart.getTime() + i * INTERVAL * 60000)
    const intervalEvents: any[] = []

    workoutEvents.forEach((w) => {
      const msDiff = Math.abs(currentTime.getTime() - w.start.getTime())
      if (msDiff < (INTERVAL * 60000) / 2) {
        intervalEvents.push({
          name: w.title,
          type: 'workout',
          icon: 'i-tabler-bike',
          carbs: -w.drainGramsPerInterval,
          fluid: w.drainFluidPerInterval
        })
      }
    })

    finalMeals.forEach((m) => {
      const msDiff = Math.abs(currentTime.getTime() - m.time.getTime())
      if (msDiff < (INTERVAL * 60000) / 2) {
        intervalEvents.push({
          name: m.name,
          type: 'meal',
          icon: 'i-tabler-tools-kitchen-2',
          carbs: m.totalCarbs,
          fluid: m.totalFluid || 0
        })
      }
    })

    const activeWorkout = workoutEvents.find((w) => currentTime >= w.start && currentTime < w.end)
    const hasEvents = intervalEvents.length > 0
    const primaryType = intervalEvents.find((e) => e.type === 'workout') ? 'workout' : 'meal'
    const eventNames = intervalEvents
      .map((e) => (typeof e.name === 'string' ? e.name.trim() : ''))
      .filter((name) => name.length > 0)
    const combinedName =
      eventNames.join(' + ') || (primaryType === 'meal' ? 'Planned Meal' : 'Planned Workout')
    const totalEventCarbs = intervalEvents.reduce((sum, e) => sum + (e.carbs || 0), 0)
    const totalEventFluid = intervalEvents.reduce((sum, e) => sum + (e.fluid || 0), 0)

    points.push({
      time: formatInTimeZone(currentTime, timezone, 'HH:mm'),
      timestamp: currentTime.getTime(),
      level: Math.round((currentGrams / C_cap) * 100),
      kcalBalance: Math.round(cumulativeKcalDelta),
      carbBalance: Math.round(cumulativeCarbDelta),
      fluidDeficit: Math.round(currentFluidDeficit),
      isFuture: currentTime > now,
      intakeProvenance: dayIntakeProvenance,
      event: hasEvents ? combinedName : undefined,
      eventType: hasEvents ? primaryType : undefined,
      eventCarbs: hasEvents ? Math.round(totalEventCarbs) : undefined,
      eventFluid: hasEvents ? Math.round(totalEventFluid) : undefined,
      eventIcon: hasEvents
        ? intervalEvents.length > 1
          ? 'i-tabler-layers-intersect'
          : intervalEvents[0].icon
        : undefined
    })

    if (i < TOTAL_POINTS) {
      currentGrams -= intervalRestDrainGrams
      cumulativeKcalDelta -= intervalRestDrainKcal
      cumulativeCarbDelta -= intervalRestDrainGrams
      currentFluidDeficit += intervalRestFluidLoss

      if (activeWorkout) {
        const drop = activeWorkout.drainGramsPerInterval * WORKOUT_DRAIN_MULTIPLIER
        currentGrams -= drop
        cumulativeKcalDelta -= activeWorkout.drainKcalPerInterval * WORKOUT_DRAIN_MULTIPLIER
        cumulativeCarbDelta -= drop
        currentFluidDeficit += activeWorkout.drainFluidPerInterval
      }

      let intervalGramsIn = 0
      let intervalKcalIn = 0
      let intervalFluidIn = 0
      const hourKey = formatInTimeZone(currentTime, timezone, 'yyyy-MM-dd-HH')
      const localHour = parseInt(formatInTimeZone(currentTime, timezone, 'H'), 10)
      const isPassiveWindow =
        localHour >= PASSIVE_REHYDRATION_START_HOUR && localHour < PASSIVE_REHYDRATION_END_HOUR

      finalMeals.forEach((meal) => {
        const minsSince = (currentTime.getTime() - meal.time.getTime()) / 60000
        if (minsSince >= 0) {
          const absorbed = getAbsorbedInInterval(
            minsSince,
            minsSince + INTERVAL,
            meal.totalCarbs,
            meal.profile
          )
          intervalGramsIn += absorbed
          const kcalFactor = meal.totalCarbs > 0 ? absorbed / meal.totalCarbs : 0
          intervalKcalIn += (meal.totalKcal || 0) * kcalFactor

          if (minsSince < INTERVAL) {
            intervalFluidIn += meal.totalFluid || 0
          }
        }
      })

      // Roughly 90g/hr, the ceiling on what the gut can take up. Whatever the cap holds back has
      // not been absorbed, so its energy must be held back with it - otherwise a big meal credited
      // calories the athlete could not yet have used.
      const cappedGramsIn = Math.min(intervalGramsIn, INTERVAL_CARB_ABSORPTION_CAP_G)
      const absorbedRatio = intervalGramsIn > 0 ? cappedGramsIn / intervalGramsIn : 0
      currentGrams += cappedGramsIn
      cumulativeKcalDelta += intervalKcalIn * absorbedRatio
      cumulativeCarbDelta += cappedGramsIn

      if (isPassiveWindow && !manualFluidHours.has(hourKey)) {
        intervalFluidIn += PASSIVE_REHYDRATION_ML_PER_HOUR * (INTERVAL / 60)
      }
      currentFluidDeficit -= intervalFluidIn
      if (workoutEvents.length === 0) {
        currentFluidDeficit -= NO_EXERCISE_DEBT_DECAY_ML_PER_HOUR * (INTERVAL / 60)
      }
      currentFluidDeficit = Math.max(0, currentFluidDeficit)

      currentGrams = Math.max(0, Math.min(C_cap, currentGrams))
    }
  }

  return points
}
