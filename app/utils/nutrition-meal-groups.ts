/**
 * Groups a fueling window's logged items under the meal headings it covers.
 *
 * Two different vocabularies meet here. Logged items always carry one of the four fixed DB buckets
 * (`breakfast | lunch | dinner | snacks`), because the `Nutrition` record has four JSON columns.
 * Scheduled slots come from the athlete's own meal pattern and are free text in any language.
 *
 * Filtering the scheduled slots through the four bucket names - which is what this replaced -
 * dropped every custom or non-English slot, so a renamed slot lost its heading and a scheduled but
 * empty one rendered nothing at all.
 */

export type MealGroup = {
  meal: string
  label: string
  items: any[]
  isScheduled: boolean
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks'
}

/** Display order for the fixed buckets; custom slots follow, in meal-pattern order. */
const BUCKET_ORDER = ['breakfast', 'lunch', 'dinner', 'snacks']

/**
 * Slot names that mean one of the fixed buckets rather than a slot of their own.
 *
 * The shipped default meal pattern names the slot "Snack" while the DB bucket is "snacks" - without
 * this, the default athlete would see both a populated "Snacks" heading and an empty "Snack" one.
 */
const BUCKET_ALIASES: Record<string, string> = {
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner',
  supper: 'dinner',
  snack: 'snacks',
  snacks: 'snacks'
}

export function groupWindowItemsByMeal(items: any[], scheduledNames: string[] = []): MealGroup[] {
  const groups: Record<string, any[]> = {}

  for (const item of items || []) {
    const meal = item?.meal || 'snacks'
    if (!groups[meal]) groups[meal] = []
    groups[meal]!.push(item)
  }

  const scheduled: { key: string; label: string }[] = []
  for (const name of scheduledNames || []) {
    if (typeof name !== 'string' || !name.trim()) continue
    const normalized = name.toLowerCase().trim()
    const key = BUCKET_ALIASES[normalized] || normalized
    scheduled.push({ key, label: name.trim() })
  }

  const orderOf = (key: string) => {
    const index = BUCKET_ORDER.indexOf(key)
    if (index !== -1) return index
    return BUCKET_ORDER.length + scheduled.findIndex((slot) => slot.key === key)
  }

  const keys = new Set<string>([
    ...BUCKET_ORDER.filter((bucket) => (groups[bucket]?.length ?? 0) > 0),
    ...scheduled.map((slot) => slot.key)
  ])

  return Array.from(keys)
    .sort((a, b) => orderOf(a) - orderOf(b))
    .map((key) => ({
      meal: key,
      label: MEAL_LABELS[key] || scheduled.find((slot) => slot.key === key)?.label || 'Snacks',
      items: groups[key] || [],
      isScheduled: scheduled.some((slot) => slot.key === key)
    }))
}
