import { defineStore } from 'pinia'
import { toRaw } from 'vue'
import type { SubscriptionTier, SubscriptionStatus } from '@prisma/client'
import { LBS_TO_KG } from '~/utils/metrics'
import { showDashboardProgressToast } from '~/utils/dashboard-progress-toast'
interface User {
  id: string
  email: string
  name: string | null
  image: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  subscriptionTier: SubscriptionTier
  subscriptionStatus: SubscriptionStatus
  subscriptionPeriodEnd: Date | null
  nutritionTrackingEnabled?: boolean
  pendingSubscriptionTier: SubscriptionTier | null
  pendingSubscriptionPeriodEnd: Date | null
  trialEndsAt: Date | null
  shareRewardClaimedAt: Date | null
  shareRewardDaysGranted: number | null
  dashboardSettings?: any
  isAdmin?: boolean
  language?: string
  uiLanguage?: string
  entitlements?: UserEntitlements
  activePromotionalGrant?: {
    tier: SubscriptionTier
    endsAt: string
    campaignSlug: string
    partnerName: string
    campaignName: string
  } | null
}

interface UserEntitlements {
  tier: 'FREE' | 'SUPPORTER' | 'PRO'
  autoSync: boolean
  autoAnalysis: boolean
  aiModel: 'flash' | 'pro'
  priorityProcessing: boolean
  proactivity: boolean
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const profile = ref<any>(null)
  const dataSyncStatus = ref<any>(null)
  const missingFields = ref<string[]>([])
  const loading = ref(false)
  const generating = ref(false)
  const userLoading = ref(false)
  const toast = useToast()
  const { refresh: refreshRuns } = useUserRuns()
  const { onTaskCompleted } = useUserRunsState()

  // Fetch user data (including subscription)
  async function fetchUser(force = false) {
    if (user.value && !force) return

    userLoading.value = true
    try {
      const fetcher = import.meta.server ? (useRequestFetch() as any) : ($fetch as any)
      const data = await fetcher('/api/user/me')
      user.value = data as User
    } catch (error: any) {
      // Don't log 401 on server to avoid noise if session is just not initialized yet
      if (!(import.meta.server && error.statusCode === 401)) {
        console.error('Error fetching user:', error)
      }
      user.value = null
    } finally {
      userLoading.value = false
    }
  }

  function cloneSerializable<T>(value: T): T {
    return JSON.parse(JSON.stringify(toRaw(value)))
  }

  // Update dashboard settings
  async function updateDashboardSettings(settings: any) {
    if (!user.value) return

    const previousDashboardSettings = cloneSerializable(user.value.dashboardSettings || {})
    const serializableSettings = cloneSerializable(settings)

    // Optimistic update
    if (!user.value.dashboardSettings) {
      user.value.dashboardSettings = {}
    }

    user.value.dashboardSettings = { ...user.value.dashboardSettings, ...serializableSettings }

    try {
      await ($fetch as any)('/api/user/settings', {
        method: 'PATCH',
        body: { dashboardSettings: serializableSettings }
      })
    } catch (error) {
      user.value.dashboardSettings = previousDashboardSettings
      console.error('Failed to update settings:', error)
      toast.add({
        title: 'Save Failed',
        description: 'Could not save dashboard preferences.',
        color: 'error'
      })
      throw error
    }
  }

  // Calculate user entitlements based on subscription, trial, and promotional grants
  const entitlements = computed<UserEntitlements | null>(() => {
    if (!user.value) return null

    if (user.value.entitlements) {
      return user.value.entitlements
    }

    const config = useRuntimeConfig()

    // If Stripe is not configured (self-hosted mode), everyone is PRO
    if (!config.public.stripePublishableKey) {
      return {
        tier: 'PRO',
        autoSync: true,
        autoAnalysis: true,
        aiModel: 'pro',
        priorityProcessing: true,
        proactivity: true
      }
    }

    const now = new Date()
    const periodEnd = user.value.subscriptionPeriodEnd
      ? new Date(user.value.subscriptionPeriodEnd)
      : new Date(0)

    const isContributor = user.value.subscriptionStatus === 'CONTRIBUTOR'

    // Grace period logic
    const isEffectivePremium =
      user.value.subscriptionStatus === 'ACTIVE' ||
      isContributor ||
      (user.value.subscriptionPeriodEnd && now < periodEnd)

    let effectiveTier: SubscriptionTier = 'FREE'

    if (isContributor) {
      effectiveTier = 'PRO'
    } else if (isEffectivePremium) {
      effectiveTier = user.value.subscriptionTier
    }

    const isTrialActive = Boolean(
      user.value.trialEndsAt &&
      new Date(user.value.trialEndsAt) > now &&
      user.value.subscriptionTier === 'FREE'
    )
    if (isTrialActive && !isEffectivePremium) {
      effectiveTier = effectiveTier === 'PRO' ? 'PRO' : 'SUPPORTER'
    }

    const promotionalTier = user.value.activePromotionalGrant?.tier
    if (promotionalTier) {
      const rank = { FREE: 0, SUPPORTER: 1, PRO: 2 }
      effectiveTier = rank[promotionalTier] > rank[effectiveTier] ? promotionalTier : effectiveTier
    }

    return {
      tier: effectiveTier,
      autoSync: effectiveTier !== 'FREE',
      autoAnalysis: effectiveTier !== 'FREE',
      aiModel: effectiveTier === 'PRO' ? 'pro' : 'flash',
      priorityProcessing: effectiveTier !== 'FREE',
      proactivity: effectiveTier === 'PRO'
    }
  })

  const isTrialActive = computed(() => {
    if (!user.value?.trialEndsAt) return false
    return new Date(user.value.trialEndsAt) > new Date()
  })

  const trialDaysRemaining = computed(() => {
    if (!user.value?.trialEndsAt) return 0
    const end = new Date(user.value.trialEndsAt).getTime()
    const now = new Date().getTime()
    return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))
  })

  // Check if user has a specific entitlement
  function hasEntitlement(feature: keyof Omit<UserEntitlements, 'tier'>): boolean | string {
    return entitlements.value?.[feature] ?? false
  }

  // Check if user has minimum tier
  function hasMinimumTier(minimumTier: 'FREE' | 'SUPPORTER' | 'PRO'): boolean {
    if (!entitlements.value) return false
    const tierHierarchy = { FREE: 0, SUPPORTER: 1, PRO: 2 }
    return tierHierarchy[entitlements.value.tier] >= tierHierarchy[minimumTier]
  }

  async function fetchProfile(force = false) {
    if (profile.value && !force) return

    loading.value = true
    try {
      const fetcher = import.meta.server ? (useRequestFetch() as any) : ($fetch as any)
      const data = await fetcher('/api/profile/dashboard')
      profile.value = data?.profile || null
      dataSyncStatus.value = data?.dataSyncStatus || null
      missingFields.value = data?.missingFields || []
    } catch (error: any) {
      if (!(import.meta.server && error.statusCode === 401)) {
        console.error('Error fetching profile:', error)
      }
      profile.value = null
      dataSyncStatus.value = null
      missingFields.value = []
    } finally {
      loading.value = false
    }
  }

  // Robust metric helpers that prefer Sport Settings (Default) over legacy Profile fields
  const currentFtp = computed(() => {
    if (!profile.value) return 0
    const defaultSettings = profile.value.sportSettings?.find((s: any) => s.isDefault)
    return defaultSettings?.ftp || profile.value.ftp || 0
  })

  const sportTypeGroups: Record<string, string[]> = {
    ride: ['Ride', 'GravelRide', 'TrackRide', 'MountainBikeRide', 'VirtualRide'],
    run: ['Run', 'VirtualRun', 'TrailRun'],
    swim: ['Swim', 'OpenWaterSwim'],
    ski: ['NordicSki', 'VirtualSki']
  }

  const defaultSportSettings = computed(() => {
    return profile.value?.sportSettings?.find((s: any) => s.isDefault) || null
  })

  function getSportFtp(groupKey: keyof typeof sportTypeGroups): number {
    if (!profile.value?.sportSettings) return 0

    const matchedSetting = profile.value.sportSettings.find(
      (setting: any) =>
        !setting.isDefault &&
        Array.isArray(setting.types) &&
        setting.types.some((type: string) => sportTypeGroups[groupKey]!.includes(type)) &&
        setting.ftp
    )

    return matchedSetting?.ftp || 0
  }

  const defaultProfileFtp = computed(() => {
    return defaultSportSettings.value?.ftp || profile.value?.ftp || 0
  })

  const rideFtp = computed(() => getSportFtp('ride'))
  const runFtp = computed(() => getSportFtp('run'))
  const swimFtp = computed(() => getSportFtp('swim'))
  const skiFtp = computed(() => getSportFtp('ski'))

  const currentLthr = computed(() => {
    if (!profile.value) return 0
    const defaultSettings = profile.value.sportSettings?.find((s: any) => s.isDefault)
    return defaultSettings?.lthr || profile.value.lthr || 0
  })

  const currentMaxHr = computed(() => {
    if (!profile.value) return 0
    const defaultSettings = profile.value.sportSettings?.find((s: any) => s.isDefault)
    return defaultSettings?.maxHr || profile.value.maxHr || 0
  })

  const currentWeightKg = computed(() => {
    if (!profile.value?.weight) return 0
    // Database is now standardized to KG
    return profile.value.weight
  })

  const displayWeight = computed(() => {
    if (!profile.value?.weight) return 0
    if (profile.value.weightUnits === 'Pounds') {
      return profile.value.weight / LBS_TO_KG
    }
    return profile.value.weight
  })

  const weightUnitLabel = computed(() => {
    return profile.value?.weightUnits === 'Pounds' ? 'lbs' : 'kg'
  })

  const distanceUnitLabel = computed(() => {
    return profile.value?.distanceUnits === 'Miles' ? 'mi' : 'km'
  })

  const temperatureUnitLabel = computed(() => {
    return profile.value?.temperatureUnits === 'Fahrenheit' ? '°F' : '°C'
  })

  const currentWkg = computed(() => {
    const w = currentWeightKg.value
    if (!w || !defaultProfileFtp.value) return 0
    return defaultProfileFtp.value / w
  })

  const currentWPrime = computed(() => {
    if (!profile.value) return 0
    const defaultSettings = profile.value.sportSettings?.find((s: any) => s.isDefault)
    return defaultSettings?.wPrime || profile.value.wPrime || 0
  })

  const currentThresholdPace = computed(() => {
    if (!profile.value) return 0
    const defaultSettings = profile.value.sportSettings?.find((s: any) => s.isDefault)
    return defaultSettings?.thresholdPace || profile.value.thresholdPace || 0
  })

  async function generateProfile() {
    const { trackAthleteProfileGenerate } = useAnalytics()
    trackAthleteProfileGenerate()
    generating.value = true
    try {
      await ($fetch as any)('/api/profile/generate', { method: 'POST' })
      refreshRuns()

      showDashboardProgressToast(
        toast,
        {
          title: 'Profile Generation Started',
          description: 'Creating your comprehensive athlete profile. This may take a minute...',
          color: 'success',
          icon: 'i-heroicons-check-circle'
        },
        'user.profile.start'
      )
    } catch (error: any) {
      generating.value = false

      if (error.statusCode === 429 || error.status === 429) {
        const { showQuotaPaywall } = useQuotaPaywall()
        await showQuotaPaywall({
          operation: 'athlete_profile_generation',
          title: 'Usage Quota Reached',
          featureTitle: 'Athlete Profile Generation',
          reason: 'quota_exceeded'
        })
        return
      }

      toast.add({
        title: 'Generation Failed',
        description: error.data?.message || 'Failed to generate profile',
        color: 'error',
        icon: 'i-heroicons-exclamation-circle'
      })
    }
  }

  // Update specific metrics (FTP, LTHR, etc.)
  async function updateUserMetrics(
    metrics: {
      ftp?: number | null
      lthr?: number | null
      maxHr?: number | null
      weight?: number | null
    },
    sportType?: string
  ) {
    loading.value = true
    try {
      await ($fetch as any)('/api/profile', {
        method: 'PATCH',
        body: { ...metrics, sportType }
      })
      await fetchProfile(true)
      toast.add({
        title: 'Success',
        description: 'Your thresholds and zones have been updated.',
        color: 'success',
        icon: 'i-heroicons-check-circle'
      })
      return true
    } catch (error: any) {
      toast.add({
        title: 'Update Failed',
        description: error.data?.message || 'Failed to update metrics',
        color: 'error'
      })
      return false
    } finally {
      loading.value = false
    }
  }

  // Listen for completion
  onTaskCompleted('generate-athlete-profile', async (run) => {
    await fetchProfile(true)
    generating.value = false

    const output = run.output as any
    if (output?.success === false) {
      if (output.reason === 'QUOTA_EXCEEDED') {
        const { showQuotaPaywall } = useQuotaPaywall()
        await showQuotaPaywall({
          operation: 'athlete_profile_generation',
          title: 'Usage Quota Reached',
          featureTitle: 'Athlete Profile Generation',
          reason: 'quota_exceeded'
        })
      } else {
        toast.add({
          title: 'Generation Failed',
          description: output.error || 'The AI could not generate your athlete profile.',
          color: 'error'
        })
      }
      return
    }

    showDashboardProgressToast(
      toast,
      {
        title: 'Profile Ready',
        description: 'Your athlete profile has been generated',
        color: 'success',
        icon: 'i-heroicons-check-badge',
        duration: 2500
      },
      'user.profile.complete'
    )
  })

  return {
    user,
    profile,
    currentFtp,
    defaultProfileFtp,
    rideFtp,
    runFtp,
    swimFtp,
    skiFtp,
    currentLthr,
    currentMaxHr,
    currentWeightKg,
    displayWeight,
    weightUnitLabel,
    distanceUnitLabel,
    temperatureUnitLabel,
    currentWkg,
    currentWPrime,
    currentThresholdPace,
    loading,
    generating,
    userLoading,
    entitlements,
    isTrialActive,
    trialDaysRemaining,
    dataSyncStatus,
    missingFields,
    fetchUser,
    updateDashboardSettings,
    fetchProfile,
    generateProfile,
    updateUserMetrics,
    hasEntitlement,
    hasMinimumTier
  }
})
