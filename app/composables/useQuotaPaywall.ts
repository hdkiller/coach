import type { PricingTier } from '~/utils/pricing'
import type { QuotaStatus } from '~/types/quotas'
import type { SubscriptionTier } from '@prisma/client'
import {
  buildQuotaFeatureDescription,
  buildQuotaUpgradeBullets,
  hasQuotaResetPassed,
  resolveRecommendedUpgradeTier,
  type QuotaPaywallOperation
} from '~~/shared/quota-paywall'
import { useNow } from '@vueuse/core'

interface QuotaSummaryResponse {
  tier: SubscriptionTier
  effectiveTier: SubscriptionTier
  isTrialActive: boolean
  showQuotaMeter: boolean
  trialEndsAt: Date | string | null
  quotas: QuotaStatus[]
}

const QUOTA_CACHE_TTL_MS = 30_000

export interface QuotaPaywallOptions {
  operation?: QuotaPaywallOperation
  title?: string
  featureTitle: string
  featureDescription?: string
  recommendedTier?: PricingTier
  bullets?: string[]
  reason?: string
  quota?: QuotaStatus | null
  quotaResetLabel?: string
}

export function useQuotaPaywall() {
  const upgradeModal = useUpgradeModal()
  const userStore = useUserStore()
  const quotasState = useState<QuotaSummaryResponse | null>('profileQuotaSummary', () => null)
  const quotasFetchedAt = useState<number>('profileQuotaSummaryFetchedAt', () => 0)
  let refreshPromise: Promise<QuotaSummaryResponse> | null = null

  const quotaSummary = computed(() => quotasState.value)

  function snapshotNeedsRefresh(now = new Date()) {
    if (!quotasState.value) return true
    if (Date.now() - quotasFetchedAt.value >= QUOTA_CACHE_TTL_MS) return true
    return quotasState.value.quotas.some((quota) => hasQuotaResetPassed(quota.resetsAt, now))
  }

  async function ensureQuotasLoaded(options: { force?: boolean } = {}) {
    if (!options.force && !snapshotNeedsRefresh()) return quotasState.value!
    if (refreshPromise) return refreshPromise

    refreshPromise = ($fetch as any)('/api/profile/quotas') as Promise<QuotaSummaryResponse>
    try {
      const summary = await refreshPromise
      quotasState.value = summary
      quotasFetchedAt.value = Date.now()
      return summary
    } finally {
      refreshPromise = null
    }
  }

  function getQuotaForOperation(
    operation: string,
    quotas?: QuotaStatus[] | null
  ): QuotaStatus | null {
    const list = quotas || quotasState.value?.quotas
    if (!Array.isArray(list)) return null
    return list.find((entry) => entry.operation === operation) || null
  }

  function buildPaywallOptions(input: QuotaPaywallOptions) {
    const subscriptionTier = (userStore.user?.subscriptionTier || 'FREE') as SubscriptionTier
    const quota = input.quota ?? (input.operation ? getQuotaForOperation(input.operation) : null)
    const effectiveTier = quotasState.value?.effectiveTier || subscriptionTier
    const quotaNextTier = quota?.nextTier?.toLowerCase() as PricingTier | undefined
    const recommendedTier =
      input.recommendedTier ?? quotaNextTier ?? resolveRecommendedUpgradeTier(effectiveTier)
    const nextTierName = recommendedTier
      ? recommendedTier === 'pro'
        ? 'Pro'
        : 'Supporter'
      : undefined

    return {
      title: input.title || 'Upgrade Your Plan',
      featureTitle: input.featureTitle,
      featureDescription:
        input.featureDescription ||
        buildQuotaFeatureDescription({
          featureLabel: input.featureTitle,
          quota,
          nextTierName
        }),
      recommendedTier,
      bullets:
        input.bullets ||
        (input.operation
          ? buildQuotaUpgradeBullets(
              input.operation,
              quota?.nextTier || (recommendedTier === 'pro' ? 'PRO' : 'SUPPORTER'),
              quota?.nextTierLimit,
              quota?.window
            )
          : []),
      reason: input.reason || 'quota_exceeded',
      quotaResetLabel: input.quotaResetLabel,
      operation: input.operation
    }
  }

  async function showQuotaPaywall(input: QuotaPaywallOptions) {
    let resolvedInput = input
    if (input.operation) {
      await ensureQuotasLoaded({ force: true })
      resolvedInput = {
        ...input,
        quota: getQuotaForOperation(input.operation) ?? input.quota
      }
    }
    upgradeModal.show(buildPaywallOptions(resolvedInput))
  }

  async function getOperationQuota(operation: string) {
    await ensureQuotasLoaded({ force: true })
    return getQuotaForOperation(operation)
  }

  function isQuotaExhausted(quota: QuotaStatus | null | undefined, now: Date = new Date()) {
    if (!quota) return false
    if (hasQuotaResetPassed(quota.resetsAt, now)) return false
    return quota.remaining <= 0 || !quota.allowed
  }

  function shouldShowQuotaMeterForUser() {
    return userStore.user?.subscriptionTier === 'FREE'
  }

  async function handleLockedAction(params: {
    operation: QuotaPaywallOperation
    featureTitle: string
    onAllowed: () => void | Promise<void>
  }) {
    if (!shouldShowQuotaMeterForUser()) {
      await params.onAllowed()
      return
    }

    await ensureQuotasLoaded()
    const quota = getQuotaForOperation(params.operation)
    if (isQuotaExhausted(quota)) {
      await showQuotaPaywall({
        operation: params.operation,
        featureTitle: params.featureTitle,
        reason: 'locked_affordance',
        quota
      })
      return
    }

    await params.onAllowed()
  }

  function useOperationLockState(operation: QuotaPaywallOperation) {
    const now = useNow({ interval: 30_000 })
    const locked = computed(() => {
      if (!shouldShowQuotaMeterForUser()) return false
      return isQuotaExhausted(getQuotaForOperation(operation), now.value)
    })

    const lockedTierLabel = computed(() => {
      const quota = getQuotaForOperation(operation)
      if (quota?.nextTier === 'PRO') return 'Pro'
      if (quota?.nextTier === 'SUPPORTER') return 'Supporter'

      const subscriptionTier =
        quotasState.value?.effectiveTier ||
        ((userStore.user?.subscriptionTier || 'FREE') as SubscriptionTier)
      const recommendedTier = resolveRecommendedUpgradeTier(subscriptionTier)
      return recommendedTier === 'pro' ? 'Pro' : recommendedTier === 'supporter' ? 'Supporter' : ''
    })

    onMounted(() => {
      void ensureQuotasLoaded()
    })

    return { locked, lockedTierLabel }
  }

  return {
    quotaSummary,
    ensureQuotasLoaded,
    getOperationQuota,
    getQuotaForOperation,
    isQuotaExhausted,
    shouldShowQuotaMeterForUser,
    showQuotaPaywall,
    buildPaywallOptions,
    handleLockedAction,
    useOperationLockState
  }
}
