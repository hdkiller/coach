import { getStructuredWorkoutObject } from '~/utils/structuredWorkout'

function hasNonEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0
}

/**
 * Canonical strength/WeightTraining structure groups exercise steps inside
 * `blocks`. A block only counts as renderable if it actually carries at
 * least one exercise step — an empty `blocks` entry (e.g. `{ steps: [] }`)
 * should not be treated as structured data.
 */
function hasRenderableBlocks(blocks: unknown): boolean {
  if (!Array.isArray(blocks) || blocks.length === 0) return false

  return blocks.some(
    (block) =>
      block &&
      typeof block === 'object' &&
      Array.isArray((block as any).steps) &&
      (block as any).steps.length > 0
  )
}

/**
 * Determines whether a (possibly wrapped) structured workout payload
 * contains renderable structure: top-level `steps` (endurance workouts),
 * `exercises` (legacy strength shape), or `blocks[].steps` (canonical
 * strength/WeightTraining structure).
 *
 * This is the shared detection helper used by chat components so that
 * WeightTraining workouts with valid `blocks` are recognized as structured
 * instead of getting stuck on a "Waiting for structured workout" state.
 */
export function hasRenderableStructure(value: any): boolean {
  const structuredWorkout = getStructuredWorkoutObject(value)
  if (!structuredWorkout || typeof structuredWorkout !== 'object') return false

  if (hasNonEmptyArray((structuredWorkout as any).steps)) return true
  if (hasNonEmptyArray((structuredWorkout as any).exercises)) return true
  if (hasRenderableBlocks((structuredWorkout as any).blocks)) return true

  return false
}
