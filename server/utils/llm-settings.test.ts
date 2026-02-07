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
    llmTierSettings: {
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
      const options = buildGoogleProviderOptions('gemini-flash-latest', 'low', 2000)
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
      const options = buildGoogleProviderOptions('gemini-flash-latest', 'low', 0)
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
    const mockTierSettings = [
      {
        id: 'tier1',
        tier: 'PRO',
        model: 'pro',
        modelId: 'gemini-3-pro-preview',
        thinkingBudget: 0,
        thinkingLevel: 'high',
        maxSteps: 5
      },
      {
        id: 'tier2',
        tier: 'FREE',
        model: 'flash',
        modelId: 'gemini-flash-latest',
        thinkingBudget: 1000,
        thinkingLevel: 'low',
        maxSteps: 3
      }
    ]

    beforeEach(() => {
      vi.clearAllMocks()
      // Reset cache by mocking the implementation to force refresh
      // (In reality we just call refreshLlmSettingsCache directly in tests)
    })

    it('should return tier default when no override exists', async () => {
      vi.mocked(prisma.llmTierSettings.findMany).mockResolvedValue(mockTierSettings as any)
      vi.mocked(prisma.llmOperationOverride.findMany).mockResolvedValue([])
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'PRO',
        subscriptionStatus: 'ACTIVE'
      } as any)

      await refreshLlmSettingsCache()
      const settings = await getLlmOperationSettings('user1', 'chat')

      expect(settings.modelId).toBe('gemini-3-pro-preview')
      expect(settings.thinkingLevel).toBe('high')
    })

    it('should apply operation override correctly', async () => {
      const mockOverrides = [
        {
          tierSettingsId: 'tier1',
          operation: 'chat',
          model: 'flash',
          modelId: 'gemini-flash-latest',
          thinkingBudget: 500,
          thinkingLevel: null,
          maxSteps: null
        }
      ]

      vi.mocked(prisma.llmTierSettings.findMany).mockResolvedValue(mockTierSettings as any)
      vi.mocked(prisma.llmOperationOverride.findMany).mockResolvedValue(mockOverrides as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'PRO',
        subscriptionStatus: 'ACTIVE'
      } as any)

      await refreshLlmSettingsCache()
      const settings = await getLlmOperationSettings('user1', 'chat')

      expect(settings.modelId).toBe('gemini-flash-latest')
      expect(settings.thinkingBudget).toBe(500)
    })

    it('should handle "Inherit" (null) vs "Disabled" (0) correctly', async () => {
      // PRO Tier default is High level (Gemini 3)
      // Override sets model to Flash (Gemini 2.5) and budget to 0 (Disabled)
      const mockOverrides = [
        {
          tierSettingsId: 'tier1',
          operation: 'disabled_op',
          model: 'flash',
          modelId: 'gemini-flash-latest',
          thinkingBudget: 0, // Explicitly 0
          thinkingLevel: null,
          maxSteps: null
        },
        {
          tierSettingsId: 'tier1',
          operation: 'inherit_op',
          model: 'flash',
          modelId: 'gemini-flash-latest',
          thinkingBudget: null, // Inherit (should fall back to tier default which is 0 for PRO but conceptually it inherits whatever is there)
          // Wait, PRO tier default has thinkingBudget: 0.
          // Let's use FREE tier which has budget 1000
          thinkingLevel: null,
          maxSteps: null
        }
      ]

      // Let's test against FREE tier which has a budget
      const mockFreeOverrides = [
        {
          tierSettingsId: 'tier2', // FREE
          operation: 'disabled_op',
          thinkingBudget: 0 // Explicitly 0 (Disabled)
        },
        {
          tierSettingsId: 'tier2', // FREE
          operation: 'inherit_op',
          thinkingBudget: null // Inherit (should be 1000)
        }
      ]

      vi.mocked(prisma.llmTierSettings.findMany).mockResolvedValue(mockTierSettings as any)
      vi.mocked(prisma.llmOperationOverride.findMany).mockResolvedValue(mockFreeOverrides as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'FREE',
        subscriptionStatus: 'ACTIVE'
      } as any)

      await refreshLlmSettingsCache()

      // Case 1: Explicitly Disabled (0)
      const disabledSettings = await getLlmOperationSettings('user2', 'disabled_op')
      expect(disabledSettings.thinkingBudget).toBe(0)

      // Case 2: Inherit (null) -> Falls back to Tier Default (1000)
      const inheritSettings = await getLlmOperationSettings('user2', 'inherit_op')
      expect(inheritSettings.thinkingBudget).toBe(1000)
    })

    it('should prioritize CONTRIBUTOR status over PRO tier', async () => {
      // Mock CONTRIBUTOR tier settings
      const contributorSettings = {
        id: 'tier_contrib',
        tier: 'CONTRIBUTOR',
        model: 'pro',
        modelId: 'gemini-3-pro-preview',
        thinkingBudget: 0,
        thinkingLevel: 'high',
        maxSteps: 10
      }

      vi.mocked(prisma.llmTierSettings.findMany).mockResolvedValue([
        ...mockTierSettings,
        contributorSettings
      ] as any)
      vi.mocked(prisma.llmOperationOverride.findMany).mockResolvedValue([])

      // User is PRO but also CONTRIBUTOR status
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'PRO',
        subscriptionStatus: 'CONTRIBUTOR'
      } as any)

      await refreshLlmSettingsCache()
      const settings = await getLlmOperationSettings('user_contrib', 'chat')

      expect(settings.maxSteps).toBe(10) // Contributor level
    })
  })
})
