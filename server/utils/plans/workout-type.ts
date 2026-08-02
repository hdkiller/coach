/**
 * Normalization of AI-generated workout types to the canonical types stored in
 * the database and understood by integrations (Intervals.icu, UI icons, filters).
 *
 * The plan generators prompt the model with friendly type names ("Gym"), but the
 * database convention is "WeightTraining". Historically only the weekly-plan
 * generator normalized this, so block generation produced mixed taxonomies in
 * the same plan ("Gym" and "WeightTraining" rows side by side). (CW-317)
 */

const AI_TYPE_TO_CANONICAL: Record<string, string> = {
  Gym: 'WeightTraining'
}

export function normalizeGeneratedWorkoutType(aiType: string): string {
  return AI_TYPE_TO_CANONICAL[aiType] || aiType
}
