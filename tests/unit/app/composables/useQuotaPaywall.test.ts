// @vitest-environment nuxt

import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useQuotaPaywall } from '../../../../app/composables/useQuotaPaywall'

const mockShowUpgradeModal = vi.fn()

mockNuxtImport('useUpgradeModal', () => () => ({ show: mockShowUpgradeModal }))
mockNuxtImport('useUserStore', () => () => ({ user: { subscriptionTier: 'FREE' } }))

describe('useQuotaPaywall Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('$fetch', vi.fn())
  })

  it('correctly detects quota exhaustion status', () => {
    const { isQuotaExhausted } = useQuotaPaywall()

    const activeQuota = {
      operation: 'ai_chat_message',
      limit: 10,
      used: 5,
      remaining: 5,
      resetsAt: new Date(Date.now() + 3600000).toISOString(),
      allowed: true
    }

    const exhaustedQuota = {
      operation: 'ai_chat_message',
      limit: 10,
      used: 10,
      remaining: 0,
      resetsAt: new Date(Date.now() + 3600000).toISOString(),
      allowed: false
    }

    expect(isQuotaExhausted(activeQuota as any)).toBe(false)
    expect(isQuotaExhausted(exhaustedQuota as any)).toBe(true)
  })

  it('determines showQuotaMeter based on subscription tier', () => {
    const { shouldShowQuotaMeterForUser } = useQuotaPaywall()
    expect(shouldShowQuotaMeterForUser()).toBe(true)
  })

  it('triggers upgrade modal via showQuotaPaywall', async () => {
    const { showQuotaPaywall } = useQuotaPaywall()

    vi.stubGlobal(
      '$fetch',
      vi.fn().mockResolvedValue({
        tier: 'FREE',
        effectiveTier: 'FREE',
        quotas: []
      })
    )

    await showQuotaPaywall({
      featureTitle: 'AI Chat Advisor'
    })

    expect(mockShowUpgradeModal).toHaveBeenCalledWith(
      expect.objectContaining({
        featureTitle: 'AI Chat Advisor',
        title: 'Upgrade Your Plan'
      })
    )
  })
})
