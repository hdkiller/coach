import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getUserAiSettings } from '../../../../server/utils/ai-user-settings'
import { prisma } from '../../../../server/utils/db'

// Mock prisma
vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    }
  }
}))

describe('getUserAiSettings', () => {
  const userId = 'user-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return user settings including aiContext when user exists', async () => {
    const mockUser = {
      aiPersona: 'Drill Sergeant',
      aiModelPreference: 'pro',
      aiAutoAnalyzeWorkouts: true,
      aiAutoAnalyzeNutrition: true,
      aiAutoAnalyzeReadiness: true,
      aiContext: 'I have a sore knee.'
    }

    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)

    const result = await getUserAiSettings(userId)

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: userId },
      select: {
        aiPersona: true,
        aiModelPreference: true,
        aiAutoAnalyzeWorkouts: true,
        aiAutoAnalyzeNutrition: true,
        aiAutoAnalyzeReadiness: true,
        aiRequireToolApproval: true,
        aiContext: true,
        nickname: true,
        nutritionTrackingEnabled: true,
        updateWorkoutNotesEnabled: true
      }
    })

    expect(result).toEqual({
      aiPersona: 'Drill Sergeant',
      aiModelPreference: 'pro',
      aiAutoAnalyzeWorkouts: true,
      aiAutoAnalyzeNutrition: true,
      aiAutoAnalyzeReadiness: true,
      aiRequireToolApproval: false,
      aiContext: 'I have a sore knee.',
      nickname: undefined,
      nutritionTrackingEnabled: true,
      updateWorkoutNotesEnabled: true
    })
  })

  it('should return default settings with null aiContext when user does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const result = await getUserAiSettings(userId)

    expect(result).toEqual({
      aiPersona: 'Supportive',
      aiModelPreference: 'flash',
      aiAutoAnalyzeWorkouts: false,
      aiAutoAnalyzeNutrition: false,
      aiAutoAnalyzeReadiness: false,
      aiRequireToolApproval: false,
      aiContext: null,
      nickname: null,
      nutritionTrackingEnabled: true,
      updateWorkoutNotesEnabled: true
    })
  })

  it('should return default values for missing user fields', async () => {
    const mockUser = {
      // Missing fields
    }

    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)

    const result = await getUserAiSettings(userId)

    expect(result).toEqual({
      aiPersona: 'Supportive',
      aiModelPreference: 'flash',
      aiAutoAnalyzeWorkouts: false,
      aiAutoAnalyzeNutrition: false,
      aiAutoAnalyzeReadiness: false,
      aiRequireToolApproval: false,
      aiContext: undefined,
      nickname: undefined,
      nutritionTrackingEnabled: true,
      updateWorkoutNotesEnabled: true
    })
  })
})
