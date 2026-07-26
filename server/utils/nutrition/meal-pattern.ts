export const DEFAULT_MEAL_TIMES: Record<'breakfast' | 'lunch' | 'dinner' | 'snacks', string> = {
  breakfast: '07:00',
  lunch: '12:00',
  dinner: '18:00',
  snacks: '15:00'
}

/**
 * The time an athlete has scheduled for a slot they named themselves.
 *
 * The DB has four fixed meal buckets, so a custom slot like "Elevenses" or "Sport" is stored under
 * `snacks`. That mapping must not also throw away *when* the slot happens - the meal pattern knows
 * it exactly, and the timestamp drives both the timeline and the metabolic simulation.
 *
 * Returns null when the pattern has no slot by that name, so the caller can fall back to the
 * bucket's own scheduled time.
 */
export function pickSlotScheduledTime(slotName: string, mealPattern: unknown): string | null {
  if (!Array.isArray(mealPattern) || mealPattern.length === 0) return null

  const normalized = String(slotName || '')
    .toLowerCase()
    .trim()
  if (!normalized) return null

  const pattern = mealPattern as Array<{ name?: string; time?: string }>
  const hit = pattern.find(
    (slot) => typeof slot?.name === 'string' && slot.name.toLowerCase().trim() === normalized
  )
  return hit?.time || null
}

export function pickMealScheduledTime(
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks',
  mealPattern: unknown
): string {
  if (!Array.isArray(mealPattern) || mealPattern.length === 0) return DEFAULT_MEAL_TIMES[mealType]

  const pattern = mealPattern as Array<{ name?: string; time?: string }>
  const normalizedType = mealType.toLowerCase()

  const exact = pattern.find(
    (slot) => typeof slot?.name === 'string' && slot.name.toLowerCase().trim() === normalizedType
  )
  if (exact?.time) return exact.time

  const aliases: Record<string, string[]> = {
    breakfast: ['breakfast', 'morning'],
    lunch: ['lunch', 'noon', 'midday'],
    dinner: ['dinner', 'supper', 'evening'],
    snacks: ['snack', 'snacks']
  }

  const aliasHit = pattern.find((slot) => {
    if (typeof slot?.name !== 'string') return false
    const n = slot.name.toLowerCase()
    return aliases[normalizedType]?.some((alias) => n.includes(alias))
  })
  if (aliasHit?.time) return aliasHit.time

  const fallbackIndex: Record<string, number> = { breakfast: 0, lunch: 1, dinner: 2, snacks: 3 }
  const byIndex = pattern[fallbackIndex[normalizedType] ?? 0]
  if (byIndex?.time) return byIndex.time

  return DEFAULT_MEAL_TIMES[mealType]
}
