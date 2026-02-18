import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildGoogleProviderOptions } from './gemini'
import {
  getLlmOperationSettings,
  refreshLlmSettingsCache,
  type LlmOperationSettings
} from './ai-operation-settings'
import { prisma } from './db'

// Mock Prisma
vi.mock('./db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    },
    llmAnalysisLevelSettings: {
      findMany: vi.fn()
    },
    llmOperationOverride: {
      findMany: vi.fn()
    }
  }
}))

describe('LLM Settings Logic', () => {
  describe('buildGoogleProviderOptions', () => {
    it('should configure thinkingBudget for Gemini 2.5 models', () => {
      const options = buildGoogleProviderOptions('gemini-2.5-flash', 'low', 2000)
      expect(options).toEqual({
        google: {
          thinkingConfig: {
            thinkingBudget: 2000,
            includeThoughts: true
          }
        }
      })
    })

    it('should NOT configure thinkingBudget if budget is 0', () => {
      const options = buildGoogleProviderOptions('gemini-2.5-flash', 'low', 0)
      expect(options).toEqual({})
    })

    it('should configure thinkingLevel for Gemini 3 Flash', () => {
      const options = buildGoogleProviderOptions('gemini-3-flash-preview', 'medium', 0)
      expect(options).toEqual({
        google: {
          thinkingConfig: {
            thinkingLevel: 'medium',
            includeThoughts: true
          }
        }
      })
    })

    it('should configure thinkingLevel for Gemini 3 Pro (High)', () => {
      const options = buildGoogleProviderOptions('gemini-3-pro-preview', 'high', 0)
      expect(options).toEqual({
        google: {
          thinkingConfig: {
            thinkingLevel: 'high',
            includeThoughts: true
          }
        }
      })
    })

    it('should sanitize thinkingLevel for Gemini 3 Pro (Minimal -> Low)', () => {
      const options = buildGoogleProviderOptions('gemini-3-pro-preview', 'minimal', 0)
      expect(options).toEqual({
        google: {
          thinkingConfig: {
            thinkingLevel: 'low',
            includeThoughts: true
          }
        }
      })
    })

    it('should sanitize thinkingLevel for Gemini 3 Pro (Medium -> High)', () => {
      const options = buildGoogleProviderOptions('gemini-3-pro-preview', 'medium', 0)
      expect(options).toEqual({
        google: {
          thinkingConfig: {
            thinkingLevel: 'high',
            includeThoughts: true
          }
        }
      })
    })
  })

  describe('getLlmOperationSettings', () => {
    const mockLevelSettings = [
      {
        id: 'level1',
        level: 'pro',
        model: 'pro',
        modelId: 'gemini-3-pro-preview',
        thinkingBudget: 0,
        thinkingLevel: 'high',
        maxSteps: 5
      },
      {
        id: 'level2',
        level: 'flash',
        model: 'flash',
        modelId: 'gemini-2.5-flash',
        thinkingBudget: 1000,
        thinkingLevel: 'low',
        maxSteps: 3
      },
      {
        id: 'level3',
        level: 'experimental',
        model: 'pro',
        modelId: 'gemini-3-pro-preview',
        thinkingBudget: 0,
        thinkingLevel: 'high',
        maxSteps: 20
      }
    ]

    beforeEach(() => {
      vi.clearAllMocks()
      // Reset cache by mocking the implementation to force refresh
      // (In reality we just call refreshLlmSettingsCache directly in tests)
    })

    it('should return level default when no override exists', async () => {
      vi.mocked(prisma.llmAnalysisLevelSettings.findMany).mockResolvedValue(
        mockLevelSettings as any
      )
      vi.mocked(prisma.llmOperationOverride.findMany).mockResolvedValue([])
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        aiModelPreference: 'pro'
      } as any)

      await refreshLlmSettingsCache()
      const settings = await getLlmOperationSettings('user1', 'chat')

      expect(settings.modelId).toBe('gemini-3-pro-preview')
      expect(settings.thinkingLevel).toBe('high')
    })

    it('should apply operation override correctly', async () => {
      const mockOverrides = [
        {
          analysisLevelSettingsId: 'level1',
          operation: 'chat',
          model: 'flash',
          modelId: 'gemini-2.5-flash',
          thinkingBudget: 500,
          thinkingLevel: null,
          maxSteps: null
        }
      ]

      vi.mocked(prisma.llmAnalysisLevelSettings.findMany).mockResolvedValue(
        mockLevelSettings as any
      )
      vi.mocked(prisma.llmOperationOverride.findMany).mockResolvedValue(mockOverrides as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        aiModelPreference: 'pro'
      } as any)

      await refreshLlmSettingsCache()
      const settings = await getLlmOperationSettings('user1', 'chat')

      expect(settings.modelId).toBe('gemini-2.5-flash')
      expect(settings.thinkingBudget).toBe(500)
    })

    it('should handle "Inherit" (null) vs "Disabled" (0) correctly', async () => {
      // flash level has a budget of 1000
      const mockFlashOverrides = [
        {
          analysisLevelSettingsId: 'level2', // flash
          operation: 'disabled_op',
          thinkingBudget: 0 // Explicitly 0 (Disabled)
        },
        {
          analysisLevelSettingsId: 'level2', // flash
          operation: 'inherit_op',
          thinkingBudget: null // Inherit (should be 1000)
        }
      ]

      vi.mocked(prisma.llmAnalysisLevelSettings.findMany).mockResolvedValue(
        mockLevelSettings as any
      )
      vi.mocked(prisma.llmOperationOverride.findMany).mockResolvedValue(mockFlashOverrides as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        aiModelPreference: 'flash'
      } as any)

      await refreshLlmSettingsCache()

      // Case 1: Explicitly Disabled (0)
      const disabledSettings = await getLlmOperationSettings('user2', 'disabled_op')
      expect(disabledSettings.thinkingBudget).toBe(0)

      // Case 2: Inherit (null) -> Falls back to Level Default (1000)
      const inheritSettings = await getLlmOperationSettings('user2', 'inherit_op')
      expect(inheritSettings.thinkingBudget).toBe(1000)
    })

    it('should use user preference "experimental" correctly', async () => {
      vi.mocked(prisma.llmAnalysisLevelSettings.findMany).mockResolvedValue(
        mockLevelSettings as any
      )
      vi.mocked(prisma.llmOperationOverride.findMany).mockResolvedValue([])

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        aiModelPreference: 'experimental'
      } as any)

      await refreshLlmSettingsCache()
      const settings = await getLlmOperationSettings('user_exp', 'chat')

      expect(settings.maxSteps).toBe(20) // Experimental level
    })
  })
})
