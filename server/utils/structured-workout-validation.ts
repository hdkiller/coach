function hasNonEmptySteps(steps: unknown): boolean {
  return Array.isArray(steps) && steps.length > 0
}

function hasRenderableStrengthBlocks(blocks: unknown): boolean {
  if (!Array.isArray(blocks) || blocks.length === 0) return false
  return blocks.some(
    (block) =>
      block &&
      typeof block === 'object' &&
      Array.isArray((block as any).steps) &&
      (block as any).steps.length > 0
  )
}

export function hasValidRepeatBlockRecovery(steps: unknown): {
  valid: boolean
  reason: string | null
} {
  if (!Array.isArray(steps)) return { valid: true, reason: null }

  for (const step of steps) {
    if (!step || typeof step !== 'object') continue

    const reps = Number((step as any).reps ?? (step as any).repeat ?? (step as any).intervals ?? 1)
    const hasSubSteps = Array.isArray((step as any).steps) && (step as any).steps.length > 0

    if (reps > 1) {
      if (!hasSubSteps) {
        const restSec = Number((step as any).restSeconds) || 0
        if (restSec <= 0) {
          const stepName = (step as any).name || 'Interval'
          return {
            valid: false,
            reason: `repeat block "${stepName}" with ${reps} reps lacks recovery/rest steps`
          }
        }
      } else {
        const childSteps = (step as any).steps as any[]
        const hasNonZeroRecovery = childSteps.some((child: any) => {
          if (!child || typeof child !== 'object') return false
          const childType = String(child.type || '').toLowerCase()
          const childIntent = String(child.intent || '').toLowerCase()
          const durationSec = Number(child.durationSeconds) || Number(child.duration) || 0
          const distM = Number(child.distanceMeters) || Number(child.distance) || 0
          const restSec = Number(child.restSeconds) || 0

          const isRecoveryTypeOrIntent =
            childType === 'rest' ||
            childType === 'cooldown' ||
            childIntent === 'recovery' ||
            childIntent === 'rest' ||
            childIntent === 'easy'

          const hasDurationOrDistanceOrRest = durationSec > 0 || distM > 0 || restSec > 0

          if (isRecoveryTypeOrIntent && hasDurationOrDistanceOrRest) return true
          if (restSec > 0) return true

          if (Array.isArray(child.steps) && child.steps.length > 0) {
            const childReps = Number(child.reps ?? child.repeat ?? child.intervals ?? 1)
            if (childReps > 1) {
              const nestedRes = hasValidRepeatBlockRecovery([child])
              return nestedRes.valid
            }
          }

          return false
        })

        if (!hasNonZeroRecovery) {
          const stepName = (step as any).name || 'Interval'
          return {
            valid: false,
            reason: `repeat block "${stepName}" with ${reps} reps lacks recovery/rest steps`
          }
        }
      }
    }

    if (hasSubSteps) {
      const childCheck = hasValidRepeatBlockRecovery((step as any).steps)
      if (!childCheck.valid) return childCheck
    }
  }

  return { valid: true, reason: null }
}

export function assertRenderableStructure(
  structure: unknown,
  workoutType?: string | null
): { valid: boolean; reason: string | null } {
  if (!structure || typeof structure !== 'object' || Array.isArray(structure)) {
    return { valid: false, reason: 'structure payload is missing or invalid' }
  }

  const payload = structure as Record<string, unknown>
  const hasSteps = hasNonEmptySteps(payload.steps)
  const hasExercises = hasNonEmptySteps(payload.exercises)
  const hasBlocks = hasRenderableStrengthBlocks(payload.blocks)

  if (hasSteps || hasExercises || hasBlocks) {
    return { valid: true, reason: null }
  }

  const normalizedType = String(workoutType || '').toLowerCase()
  if (normalizedType.includes('gym') || normalizedType.includes('weight')) {
    return {
      valid: false,
      reason: 'strength structure has no blocks with exercise steps'
    }
  }

  return {
    valid: false,
    reason: 'structure has no steps, exercises, or blocks'
  }
}
