export type NutritionSource = 'MANUAL' | 'AI' | 'INTEGRATION' | 'YAZIO'

// Higher index = Higher Priority
const PRECEDENCE_ORDER: NutritionSource[] = ['YAZIO', 'INTEGRATION', 'AI', 'MANUAL']

export function shouldOverwrite(
  existingSource: string | null | undefined,
  newSource: NutritionSource
): boolean {
  if (!existingSource) return true

  // Normalize source strings
  const existNorm = existingSource.toUpperCase() as NutritionSource
  const newNorm = newSource.toUpperCase() as NutritionSource

  const existIdx = PRECEDENCE_ORDER.indexOf(existNorm)
  const newIdx = PRECEDENCE_ORDER.indexOf(newNorm)

  // If source is unknown, treat as lowest priority (-1)
  // Overwrite if new source is >= existing source priority
  return newIdx >= existIdx
}
