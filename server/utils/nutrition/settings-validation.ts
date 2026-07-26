import { slugifySlot } from '../nutrition-domain/day-plan'

/**
 * Relational validation for nutrition settings.
 *
 * Every field is range-checked on its own by the Zod schema, but the fueling model reads them as a
 * set: the fuel-state triggers are tested in order, the carb ranges are averaged, and meal-slot
 * names become window identities. Combinations that are individually legal can still make a fuel
 * state unreachable, prescribe fewer carbohydrates for a harder day, or collapse two meals onto one
 * window key. See docs/issues/379.
 */

export type SettingsIssue = { path: (string | number)[]; message: string }

/** A slot time is rendered by an `<input type="time">`, so it is always `HH:mm` or `HH:mm:ss`. */
export const MEAL_SLOT_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/

export type MealSlotPattern = { name: string; time: string }

/**
 * Validates a complete meal pattern.
 *
 * The array is always replaced wholesale, so unlike the fuel-state fields this needs no merge with
 * what is already stored.
 */
export function validateMealPattern(mealPattern: MealSlotPattern[]): SettingsIssue[] {
  const issues: SettingsIssue[] = []
  const seenSlugs = new Map<string, number>()

  mealPattern.forEach((slot, index) => {
    const name = (slot?.name || '').trim()

    if (!name) {
      issues.push({
        path: ['mealPattern', index, 'name'],
        message: 'Meal name is required.'
      })
    } else {
      // Names collide on the slug, not the literal string: 'Post ride' and 'post-ride' are the
      // same window key, and one would silently overwrite the other.
      const slug = slugifySlot(name)
      const firstIndex = seenSlugs.get(slug)
      if (firstIndex === undefined) {
        seenSlugs.set(slug, index)
      } else {
        issues.push({
          path: ['mealPattern', index, 'name'],
          message: `Meal name "${name}" duplicates meal ${firstIndex + 1}. Each meal needs a distinct name.`
        })
      }
    }

    if (!MEAL_SLOT_TIME_PATTERN.test(slot?.time || '')) {
      issues.push({
        path: ['mealPattern', index, 'time'],
        message: `Meal time "${slot?.time ?? ''}" is not a valid time of day (HH:mm).`
      })
    }
  })

  return issues
}

type FuelStateFields = {
  fuelState1Trigger?: number | null
  fuelState2Trigger?: number | null
  fuelState1Min?: number | null
  fuelState1Max?: number | null
  fuelState2Min?: number | null
  fuelState2Max?: number | null
  fuelState3Min?: number | null
  fuelState3Max?: number | null
}

const FUEL_STATE_LABEL: Record<number, string> = {
  1: 'Easy day',
  2: 'Moderate day',
  3: 'Hard day'
}

/**
 * The values `resolveDayFuelState` falls back to when a field is unset. Validation has to reason
 * about the same numbers the model will actually use, not about `undefined`.
 */
const FUEL_STATE_FALLBACKS = {
  trigger1: 0.7,
  trigger2: 0.85,
  state1Min: 2.5,
  state1Max: 4.0,
  state2Min: 4.5,
  state2Max: 6.5,
  state3Min: 7.0,
  state3Max: 10.0
} as const

/**
 * Validates the fuel-state triggers and carb ranges as a set.
 *
 * Takes the *effective* settings - the incoming patch merged over what is stored - because the
 * endpoint accepts partial updates, and raising `fuelState1Trigger` alone can invert it against a
 * `fuelState2Trigger` that is not in the request at all.
 */
export function validateFuelStates(effective: FuelStateFields): SettingsIssue[] {
  const issues: SettingsIssue[] = []

  const num = (value: number | null | undefined, fallback: number) =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback

  const trigger1 = num(effective.fuelState1Trigger, FUEL_STATE_FALLBACKS.trigger1)
  const trigger2 = num(effective.fuelState2Trigger, FUEL_STATE_FALLBACKS.trigger2)

  // resolveDayFuelState tests trigger2 first and falls through to trigger1, so a trigger2 at or
  // below trigger1 makes fuel state 2 unreachable and gives hard-day carbohydrate to easy rides.
  if (trigger2 <= trigger1) {
    issues.push({
      path: ['fuelState2Trigger'],
      message: `The hard-day trigger (${trigger2}) must be above the moderate-day trigger (${trigger1}), otherwise moderate days can never be reached.`
    })
  }

  const f = FUEL_STATE_FALLBACKS
  const ranges = [
    {
      state: 1,
      min: num(effective.fuelState1Min, f.state1Min),
      max: num(effective.fuelState1Max, f.state1Max)
    },
    {
      state: 2,
      min: num(effective.fuelState2Min, f.state2Min),
      max: num(effective.fuelState2Max, f.state2Max)
    },
    {
      state: 3,
      min: num(effective.fuelState3Min, f.state3Min),
      max: num(effective.fuelState3Max, f.state3Max)
    }
  ]

  for (const range of ranges) {
    if (range.min > range.max) {
      issues.push({
        path: [`fuelState${range.state}Max`],
        message: `${FUEL_STATE_LABEL[range.state]} carb maximum (${range.max} g/kg) must be at least the minimum (${range.min} g/kg).`
      })
    }
  }

  // The day's target is the midpoint of its range, so the ranges have to climb with the states -
  // otherwise a harder day is prescribed less carbohydrate than an easier one.
  for (let i = 1; i < ranges.length; i++) {
    const lower = ranges[i - 1]!
    const higher = ranges[i]!
    if (higher.min < lower.min) {
      issues.push({
        path: [`fuelState${higher.state}Min`],
        message: `${FUEL_STATE_LABEL[higher.state]} carb minimum (${higher.min} g/kg) must be at least the ${FUEL_STATE_LABEL[lower.state]!.toLowerCase()} minimum (${lower.min} g/kg).`
      })
    }
    if (higher.max < lower.max) {
      issues.push({
        path: [`fuelState${higher.state}Max`],
        message: `${FUEL_STATE_LABEL[higher.state]} carb maximum (${higher.max} g/kg) must be at least the ${FUEL_STATE_LABEL[lower.state]!.toLowerCase()} maximum (${lower.max} g/kg).`
      })
    }
  }

  return issues
}
