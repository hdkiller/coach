import { beforeEach, describe, expect, it, vi } from 'vitest'

import { prisma } from '../../../../server/utils/db'
import {
  readStructuredWorkoutGeneratorModeFromFeatureFlags,
  resolveStructuredWorkoutGeneratorMode
} from '../../../../server/utils/structured-workout-generator'

vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    }
  }
}))

describe('structured workout generator resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns draft mode when no feature flags exist', async () => {
    vi.mocked((prisma as any).user.findUnique).mockResolvedValue({ featureFlags: null })

    await expect(resolveStructuredWorkoutGeneratorMode('user-1')).resolves.toBe('draft_json_v1')
  })

  it('returns draft mode when user feature flags opt in', async () => {
    vi.mocked((prisma as any).user.findUnique).mockResolvedValue({
      featureFlags: {
        structuredWorkout: {
          generator: 'draft_json_v1'
        }
      }
    })

    await expect(resolveStructuredWorkoutGeneratorMode('user-1')).resolves.toBe('draft_json_v1')
  })

  it('lets explicit override win over persisted flags', async () => {
    await expect(resolveStructuredWorkoutGeneratorMode('user-1', 'draft_json_v1')).resolves.toBe(
      'draft_json_v1'
    )
    expect((prisma as any).user.findUnique).not.toHaveBeenCalled()
  })

  it('falls back to draft mode for invalid persisted values', () => {
    expect(
      readStructuredWorkoutGeneratorModeFromFeatureFlags({
        structuredWorkout: { generator: 'something_else' }
      })
    ).toBe('draft_json_v1')
  })
})
