import { resolveShareTokenAccessMode } from './public-plans'

export function sanitizeSharedNutrition(nutrition: Record<string, unknown>) {
  const {
    userId: _userId,
    rawJson: _rawJson,
    sourcePrecedence: _sourcePrecedence,
    isChainValid: _isChainValid,
    startingGlycogenPercentage: _startingGlycogenPercentage,
    startingFluidDeficit: _startingFluidDeficit,
    endingGlycogenPercentage: _endingGlycogenPercentage,
    endingFluidDeficit: _endingFluidDeficit,
    isManualLock: _isManualLock,
    ...safe
  } = nutrition

  return safe
}

export function sanitizeSharedPlannedWorkout(
  workout: Record<string, unknown>,
  accessMode?: string | null
) {
  const { userId: _userId, ...rest } = workout
  const mode = resolveShareTokenAccessMode(accessMode)

  if (mode === 'FULL') {
    return rest
  }

  const {
    structuredWorkout: _structuredWorkout,
    description: _description,
    shareToken: _shareToken,
    ...preview
  } = rest

  return {
    ...preview,
    previewMode: true
  }
}
