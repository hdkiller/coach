export const DEFAULT_MEAL_TIMES: Record<'breakfast' | 'lunch' | 'dinner' | 'snacks', string> = {
  breakfast: '07:00',
  lunch: '12:00',
  dinner: '18:00',
  snacks: '15:00'
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
