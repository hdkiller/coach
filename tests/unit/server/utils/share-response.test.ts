import { describe, expect, it } from 'vitest'
import {
  sanitizeSharedNutrition,
  sanitizeSharedPlannedWorkout
} from '../../../../server/utils/share-response'

describe('share-response sanitizers', () => {
  it('strips internal nutrition fields', () => {
    const result = sanitizeSharedNutrition({
      id: 'nutrition-1',
      userId: 'user-1',
      date: '2026-07-08',
      calories: 2200,
      rawJson: { secret: true },
      sourcePrecedence: 'manual',
      isChainValid: true,
      startingGlycogenPercentage: 80,
      startingFluidDeficit: 0,
      endingGlycogenPercentage: 70,
      endingFluidDeficit: 1,
      isManualLock: false
    })

    expect(result).toEqual({
      id: 'nutrition-1',
      date: '2026-07-08',
      calories: 2200
    })
  })

  it('strips planned workout structure in preview mode', () => {
    const result = sanitizeSharedPlannedWorkout(
      {
        id: 'planned-1',
        userId: 'user-1',
        title: 'Tempo Run',
        description: 'Detailed coach notes',
        structuredWorkout: { steps: [{ duration: 600 }] },
        durationSec: 3600
      },
      'PREVIEW'
    )

    expect(result).toEqual({
      id: 'planned-1',
      title: 'Tempo Run',
      durationSec: 3600,
      previewMode: true
    })
  })

  it('keeps planned workout structure in full mode', () => {
    const structuredWorkout = { steps: [{ duration: 600 }] }
    const result = sanitizeSharedPlannedWorkout(
      {
        id: 'planned-1',
        userId: 'user-1',
        title: 'Tempo Run',
        structuredWorkout
      },
      'FULL'
    )

    expect(result).toEqual({
      id: 'planned-1',
      title: 'Tempo Run',
      structuredWorkout
    })
  })
})
