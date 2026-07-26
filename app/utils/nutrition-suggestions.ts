/**
 * The fallback "Coach Suggests" line for a fueling window with nothing logged.
 *
 * This is the one place in the nutrition UI that names specific foods without going through
 * `mealRecommendationService`, which filters on the athlete's dietary profile, allergies and
 * intolerances. Naming a bagel to a coeliac is the failure this guards against.
 *
 * The rule is deliberately conservative: a named suggestion is only used when constraints are
 * known *and* none of them conflict. Unknown constraints fall back to generic wording, because
 * "we were not told" is not evidence that a food is safe.
 */

export type DietaryConstraints = {
  dietaryProfile?: string[] | null
  foodAllergies?: string[] | null
  foodIntolerances?: string[] | null
  lifestyleExclusions?: string[] | null
} | null

type Suggestion = {
  /** Minimum carb target this suggestion applies to. */
  minCarbs: number
  text: string
  generic: string
  /** Constraint values that rule this suggestion out, from the settings vocabulary. */
  conflicts: string[]
}

const SUGGESTIONS: Suggestion[] = [
  {
    minCarbs: 80,
    text: 'Focus on high-glycemic carbs. Recommendation: 1 large bagel with jam and a banana.',
    generic: 'Focus on high-glycemic carbs that fit your plan.',
    // bagel: wheat, gluten, yeast, processed; jam/banana: refined sugar, fructose.
    conflicts: [
      'WHEAT',
      'GLUTEN_FREE',
      'YEAST',
      'KETO',
      'PALEO',
      'LOW_FODMAP',
      'FRUCTOSE',
      'NO_REFINED_SUGAR',
      'NO_PROCESSED_FOODS'
    ]
  },
  {
    minCarbs: 40,
    text: 'Moderate fueling needed. Try 1 bowl of oatmeal with honey.',
    generic: 'Moderate fueling needed. Aim for a carb-led meal.',
    // oats: gluten (cross-contamination), keto/paleo; honey: not vegan, fructose.
    conflicts: ['WHEAT', 'GLUTEN_FREE', 'VEGAN', 'KETO', 'PALEO', 'FRUCTOSE']
  },
  {
    minCarbs: 0,
    text: 'Light fueling. A piece of fruit or 1 energy gel will suffice.',
    generic: 'Light fueling. A small carb snack will suffice.',
    // fruit: fructose; gel: processed, sweeteners, keto.
    conflicts: ['FRUCTOSE', 'KETO', 'NO_PROCESSED_FOODS', 'NO_SWEETENERS', 'SWEETENERS']
  }
]

function normalize(values: string[] | null | undefined): string[] {
  if (!Array.isArray(values)) return []
  return values
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean)
}

/** Every constraint the athlete has set, flattened and normalized. */
export function flattenConstraints(constraints: DietaryConstraints): string[] {
  if (!constraints) return []
  return [
    ...normalize(constraints.dietaryProfile),
    ...normalize(constraints.foodAllergies),
    ...normalize(constraints.foodIntolerances),
    ...normalize(constraints.lifestyleExclusions)
  ]
}

/**
 * `constraints === null | undefined` means "not known" and yields the generic line.
 * An empty-but-present set means "no restrictions" and allows the named suggestion.
 */
export function fuelingSuggestionText(
  targetCarbs: number,
  constraints: DietaryConstraints
): string {
  const carbs = Number.isFinite(targetCarbs) ? targetCarbs : 0
  const suggestion =
    SUGGESTIONS.find((candidate) => carbs > candidate.minCarbs) ??
    (SUGGESTIONS[SUGGESTIONS.length - 1] as Suggestion)

  if (constraints === null || constraints === undefined) return suggestion.generic

  const active = flattenConstraints(constraints)
  const conflicted = suggestion.conflicts.some((conflict) => active.includes(conflict))

  return conflicted ? suggestion.generic : suggestion.text
}
