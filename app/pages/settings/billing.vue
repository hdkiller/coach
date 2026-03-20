<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'
  import { format } from 'date-fns'
  import type { SubscriptionStatus, SubscriptionTier } from '@prisma/client'

  const { t } = useTranslate('settings')
  const tr = (key: string, fallback: string, params?: Record<string, any>) =>
    typeof t.value === 'function' ? t.value(key, params) : fallback

  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: tr('billing_header', 'Billing & Subscription'),
    meta: [
      {
        name: 'description',
        content: tr('billing_description', 'Manage your subscription and billing information.')
      }
    ]
  })

  const route = useRoute()
  const userStore = useUserStore()
  const { openCustomerPortal } = useStripe()

  const loadingPortal = ref(false)
  const syncing = ref(false)
  const showSuccessMessage = ref(route.query.success === 'true')
  const showRefreshMessage = ref(route.query.refresh === 'true')
  const showCanceledMessage = ref(route.query.canceled === 'true')
  const showPlansModal = ref(false)
  const celebrationPlayed = ref(false)
  const prefersReducedMotion = ref(false)
  const confettiPieces = ref<
    Array<{
      id: number
      left: number
      driftX: number
      delay: number
      duration: number
      rotation: number
      scale: number
      color: string
    }>
  >([])

  const config = useRuntimeConfig()
  const subscriptionsEnabled = computed(() => config.public.subscriptionsEnabled)
  const welcomeName = computed(() => {
    const name = userStore.user?.name?.trim()
    return name ? name.split(' ')[0] : tr('billing_welcome_fallback_name', 'Athlete')
  })

  // Always refresh user data on mount to ensure latest subscription status.
  // After a successful checkout, also sync with Stripe so the webhook delay
  // doesn't leave the user looking at the upgrade plans.
  onMounted(async () => {
    if (import.meta.client) {
      prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      // Handle "Back" button or switching tabs
      window.addEventListener('pageshow', handlePageShow)
      window.addEventListener('focus', handleFocus)
    }

    if (showSuccessMessage.value || showRefreshMessage.value) {
      await pollSubscription()
      if (userStore.user?.subscriptionStatus === 'ACTIVE') {
        triggerCelebration()
        showSuccessMessage.value = true
      }
    } else {
      await userStore.fetchUser(true)
    }
  })

  onUnmounted(() => {
    if (import.meta.client) {
      window.removeEventListener('pageshow', handlePageShow)
      window.removeEventListener('focus', handleFocus)
      stopPastDuePolling()
    }
  })

  function handlePageShow(event: PageTransitionEvent) {
    // If page is restored from browser cache (bfcache)
    if (event.persisted) {
      handleSync(true)
    }
  }

  function handleFocus() {
    // Refresh data when user switches back to this tab
    if (userStore.user?.subscriptionStatus === 'PAST_DUE') {
      handleSync(true)
    }
  }

  const polling = ref(false)
  const pastDuePollingInterval = ref<any>(null)

  // Start polling if user is PAST_DUE
  watch(
    () => userStore.user?.subscriptionStatus,
    (newStatus) => {
      if (newStatus === 'PAST_DUE') {
        startPastDuePolling()
      } else {
        stopPastDuePolling()
      }
    },
    { immediate: true }
  )

  function startPastDuePolling() {
    if (pastDuePollingInterval.value) return

    // Poll every 5 seconds while in PAST_DUE state
    pastDuePollingInterval.value = setInterval(async () => {
      try {
        await $fetch('/api/stripe/sync', { method: 'POST' })
        await userStore.fetchUser(true)
      } catch (e) {
        console.warn('Background status sync failed:', e)
      }
    }, 5000)
  }

  function stopPastDuePolling() {
    if (pastDuePollingInterval.value) {
      clearInterval(pastDuePollingInterval.value)
      pastDuePollingInterval.value = null
    }
  }

  async function pollSubscription(maxAttempts = 5, interval = 3000) {
    const minPollingMs = 1750
    const startedAt = Date.now()
    polling.value = true
    let attempts = 0

    while (attempts < maxAttempts) {
      try {
        // 1. Sync with Stripe
        await $fetch('/api/stripe/sync', { method: 'POST' })
        // 2. Fetch updated user store
        await userStore.fetchUser(true)

        // 3. Check if upgraded
        if (
          userStore.user?.subscriptionTier !== 'FREE' &&
          userStore.user?.subscriptionStatus === 'ACTIVE'
        ) {
          const elapsed = Date.now() - startedAt
          if (elapsed < minPollingMs) {
            await new Promise((resolve) => setTimeout(resolve, minPollingMs - elapsed))
          }
          polling.value = false
          return
        }
      } catch (e) {
        console.warn('Subscription poll attempt failed:', e)
      }

      attempts++
      if (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, interval))
      }
    }
    const elapsed = Date.now() - startedAt
    if (elapsed < minPollingMs) {
      await new Promise((resolve) => setTimeout(resolve, minPollingMs - elapsed))
    }
    polling.value = false
  }

  // Computed
  const isPremium = computed(() => {
    return (
      userStore.user?.subscriptionTier === 'SUPPORTER' || userStore.user?.subscriptionTier === 'PRO'
    )
  })

  const entitlements = computed(() => {
    if (!userStore.user) return null

    // Simple client-side entitlements calculation
    const tier = userStore.user.subscriptionTier
    const status = userStore.user.subscriptionStatus
    const periodEnd = userStore.user.subscriptionPeriodEnd

    const isEffectivePremium =
      status === 'ACTIVE' ||
      status === 'CONTRIBUTOR' ||
      (periodEnd && new Date(periodEnd) > new Date())

    const effectiveTier = isEffectivePremium ? tier : 'FREE'

    return {
      tier: effectiveTier,
      autoSync: effectiveTier !== 'FREE',
      autoAnalysis: effectiveTier !== 'FREE',
      aiModel: effectiveTier === 'PRO' ? 'pro' : 'flash',
      priorityProcessing: effectiveTier !== 'FREE',
      proactivity: effectiveTier === 'PRO'
    }
  })

  const billingTrustSignals = computed(
    () =>
      [
        {
          icon: 'i-heroicons-shield-check',
          title: t.value('billing_trust_secure_title'),
          description: t.value('billing_trust_secure_desc')
        },
        {
          icon: 'i-heroicons-arrows-right-left',
          title: t.value('billing_trust_prorated_title'),
          description: t.value('billing_trust_prorated_desc')
        },
        {
          icon: 'i-heroicons-x-circle',
          title: t.value('billing_trust_cancel_title'),
          description: t.value('billing_trust_cancel_desc')
        }
      ] as const
  )

  const billingComparisonRows = computed(
    () =>
      [
        {
          feature: t.value('billing_compare_row_coaching_feature'),
          free: t.value('billing_compare_row_coaching_free'),
          supporter: t.value('billing_compare_row_coaching_supporter'),
          pro: t.value('billing_compare_row_coaching_pro')
        },
        {
          feature: t.value('billing_compare_row_analysis_feature'),
          free: t.value('billing_compare_row_analysis_free'),
          supporter: t.value('billing_compare_row_analysis_supporter'),
          pro: t.value('billing_compare_row_analysis_pro')
        },
        {
          feature: t.value('billing_compare_row_planning_feature'),
          free: t.value('billing_compare_row_planning_free'),
          supporter: t.value('billing_compare_row_planning_supporter'),
          pro: t.value('billing_compare_row_planning_pro')
        },
        {
          feature: t.value('billing_compare_row_insights_feature'),
          free: t.value('billing_compare_row_insights_free'),
          supporter: t.value('billing_compare_row_insights_supporter'),
          pro: t.value('billing_compare_row_insights_pro')
        }
      ] as const
  )

  const billingFaqs = computed(
    () =>
      [
        {
          question: t.value('billing_faq_cancel_q'),
          answer: t.value('billing_faq_cancel_a')
        },
        {
          question: t.value('billing_faq_downgrade_q'),
          answer: t.value('billing_faq_downgrade_a')
        },
        {
          question: t.value('billing_faq_pro_supporter_q'),
          answer: t.value('billing_faq_pro_supporter_a')
        },
        {
          question: t.value('billing_faq_upgrade_immediate_q'),
          answer: t.value('billing_faq_upgrade_immediate_a')
        }
      ] as const
  )

  // Methods
  function formatStatus(status: SubscriptionStatus | undefined): string {
    if (!status) return t.value('billing_status_none')
    if (status === 'CONTRIBUTOR') return t.value('billing_status_contributor')
    const map: Partial<Record<SubscriptionStatus, string>> = {
      ACTIVE: t.value('billing_status_active'),
      CANCELED: t.value('billing_status_canceled'),
      PAST_DUE: t.value('billing_status_past_due'),
      UNPAID: t.value('billing_status_unpaid'),
      TRIALING: t.value('billing_status_trialing'),
      INCOMPLETE: t.value('billing_status_incomplete')
    }
    return map[status] || status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ')
  }

  function getStatusColor(status: SubscriptionStatus | undefined): string {
    switch (status) {
      case 'ACTIVE':
        return 'green'
      case 'CANCELED':
        return 'yellow'
      case 'PAST_DUE':
        return 'orange'
      case 'UNPAID':
        return 'red'
      case 'CONTRIBUTOR':
        return 'primary'
      default:
        return 'gray'
    }
  }
  function formatTier(tier: SubscriptionTier | undefined): string {
    if (!tier) return t.value('billing_tier_free')
    if (tier === 'PRO') return t.value('billing_tier_pro')
    if (tier === 'SUPPORTER') return t.value('billing_tier_supporter')
    return t.value('billing_tier_free')
  }

  function getTierIcon(tier: SubscriptionTier | undefined): string {
    switch (tier) {
      case 'PRO':
        return 'i-heroicons-star'
      case 'SUPPORTER':
        return 'i-heroicons-heart'
      default:
        return 'i-heroicons-user'
    }
  }

  function getTierDescription(tier: SubscriptionTier | undefined): string {
    switch (tier) {
      case 'PRO':
        return t.value('billing_tier_desc_pro')
      case 'SUPPORTER':
        return t.value('billing_tier_desc_supporter')
      default:
        return t.value('billing_tier_desc_free')
    }
  }

  function formatDate(date: string | Date | undefined): string {
    if (!date) return t.value('common_na')
    return format(new Date(date), 'MMMM d, yyyy')
  }

  async function handleManageSubscription() {
    loadingPortal.value = true
    await openCustomerPortal(window.location.href)
    loadingPortal.value = false
  }

  async function handleViewInvoices() {
    loadingPortal.value = true
    await openCustomerPortal(window.location.href)
    loadingPortal.value = false
  }

  async function handleSync(silent = false) {
    if (!silent) syncing.value = true
    try {
      await $fetch('/api/stripe/sync', { method: 'POST' })
      await userStore.fetchUser(true)

      if (!silent) {
        const toast = useToast()
        toast.add({
          title: t.value('billing_sync_success_title'),
          description: t.value('billing_sync_success_desc'),
          color: 'success'
        })
      }
    } catch (e) {
      if (!silent) {
        const toast = useToast()
        toast.add({
          title: t.value('billing_sync_failed_title'),
          description: t.value('billing_sync_failed_desc'),
          color: 'error'
        })
      }
    } finally {
      if (!silent) syncing.value = false
    }
  }

  function dismissSuccessMessage() {
    showSuccessMessage.value = false
    confettiPieces.value = []
  }

  function triggerCelebration() {
    if (prefersReducedMotion.value) return
    celebrationPlayed.value = true

    const colors = ['#60a5fa', '#34d399', '#f59e0b', '#f87171', '#a78bfa', '#22d3ee']
    confettiPieces.value = Array.from({ length: 42 }, (_, index) => ({
      id: index,
      left: index % 2 === 0 ? Math.random() * 26 : 74 + Math.random() * 26,
      driftX: index % 2 === 0 ? 32 + Math.random() * 54 : -32 - Math.random() * 54,
      delay: Math.random() * 160,
      duration: 2200 + Math.random() * 300,
      rotation: Math.random() * 720 - 360,
      scale: 0.9 + Math.random() * 0.7,
      color: colors[index % colors.length] as string
    }))

    if (navigator.vibrate) {
      navigator.vibrate(35)
    }

    setTimeout(() => {
      confettiPieces.value = []
    }, 2700)
  }
</script>

<template>
  <div class="space-y-6">
    <UCard v-if="isPremium || showSuccessMessage" :ui="{ body: 'hidden' }">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold uppercase tracking-tight">{{ t('billing_header') }}</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ t('billing_description') }}
            </p>
          </div>
          <div v-if="userStore.user?.subscriptionStatus" class="hidden sm:block">
            <UBadge
              :color="getStatusColor(userStore.user?.subscriptionStatus) as any"
              class="font-semibold"
            >
              {{ formatTier(userStore.user?.subscriptionTier) }} •
              {{ formatStatus(userStore.user?.subscriptionStatus) }}
            </UBadge>
          </div>
        </div>
      </template>
    </UCard>

    <!-- Success/Canceled Alerts -->
    <div class="space-y-4">
      <UAlert
        v-if="userStore.user?.subscriptionStatus === 'PAST_DUE'"
        :title="t('billing_past_due_title')"
        icon="i-heroicons-exclamation-triangle"
        color="error"
        variant="subtle"
        class="border-error-500/50 shadow-lg animate-pulse-subtle"
        :ui="{
          title: 'text-error-900 dark:text-error-100 font-bold',
          description: 'text-error-800 dark:text-error-200'
        }"
      >
        <template #description>
          {{ t('billing_past_due_desc') }}
        </template>
        <template #actions>
          <UButton
            color="error"
            variant="solid"
            size="sm"
            class="font-bold uppercase tracking-wide"
            :loading="loadingPortal"
            @click="handleManageSubscription"
          >
            {{ t('billing_past_due_action') }}
          </UButton>
        </template>
      </UAlert>

      <UCard v-if="showSuccessMessage" class="relative overflow-hidden border-success/30">
        <div class="absolute inset-0 pointer-events-none">
          <div
            v-for="piece in confettiPieces"
            :key="piece.id"
            class="success-confetti-piece"
            :style="{
              left: `${piece.left}%`,
              '--drift-x': `${piece.driftX}px`,
              '--delay': `${piece.delay}ms`,
              '--duration': `${piece.duration}ms`,
              '--rotation': `${piece.rotation}deg`,
              '--scale': piece.scale,
              '--color': piece.color
            }"
          />
        </div>

        <div class="relative z-10 space-y-5">
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-2">
              <UBadge color="success" variant="soft" size="sm">{{
                t('billing_success_badge')
              }}</UBadge>
              <h3 class="text-2xl font-bold">
                {{ t('billing_success_title', { name: welcomeName }) }}
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-300">
                {{ t('billing_success_desc') }}
              </p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark"
              :aria-label="t('billing_dismiss')"
              @click="dismissSuccessMessage"
            />
          </div>

          <div class="grid gap-2 sm:grid-cols-3">
            <div class="rounded-lg border border-success/20 bg-success/5 p-3">
              <div class="text-xs uppercase tracking-wide text-success">
                {{ t('billing_success_card_automations') }}
              </div>
              <div class="text-sm font-semibold">
                {{ t('billing_success_card_automations_desc') }}
              </div>
            </div>
            <div class="rounded-lg border border-success/20 bg-success/5 p-3">
              <div class="text-xs uppercase tracking-wide text-success">
                {{ t('billing_success_card_models') }}
              </div>
              <div class="text-sm font-semibold">
                {{ t('billing_success_card_models_desc') }}
              </div>
            </div>
            <div class="rounded-lg border border-success/20 bg-success/5 p-3">
              <div class="text-xs uppercase tracking-wide text-success">
                {{ t('billing_success_card_proactive') }}
              </div>
              <div class="text-sm font-semibold">
                {{ t('billing_success_card_proactive_desc') }}
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <UButton
              to="/settings/ai?success=true"
              color="primary"
              icon="i-heroicons-sparkles"
              trailing-icon="i-heroicons-arrow-right"
            >
              {{ t('billing_success_open_ai_settings') }}
            </UButton>
            <UButton color="neutral" variant="ghost" @click="dismissSuccessMessage">
              {{ t('billing_dismiss') }}
            </UButton>
          </div>

          <div class="space-y-2">
            <div class="text-xs uppercase tracking-wide text-gray-500">
              {{ t('billing_quick_start_title') }}
            </div>
            <div class="space-y-1 text-sm">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-check-circle" class="h-4 w-4 text-success" />
                <span>{{ t('billing_quick_start_item_1') }}</span>
              </div>
              <div class="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <UIcon name="i-heroicons-circle-stack" class="h-4 w-4" />
                <span>{{ t('billing_quick_start_item_2') }}</span>
              </div>
              <div class="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <UIcon name="i-heroicons-cpu-chip" class="h-4 w-4" />
                <span>{{ t('billing_quick_start_item_3') }}</span>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <UAlert
        v-if="(showSuccessMessage || showRefreshMessage) && polling"
        :title="t('billing_verifying_title')"
        color="info"
        variant="soft"
        :close="{ color: 'info', variant: 'link', label: t('billing_dismiss') }"
        :description="t('billing_verifying_desc')"
        @update:open="dismissSuccessMessage"
      >
        <template #icon>
          <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin" />
        </template>
      </UAlert>

      <UAlert
        v-if="showCanceledMessage"
        :title="t('billing_checkout_canceled_title')"
        icon="i-heroicons-information-circle"
        color="info"
        variant="soft"
        :close="{ color: 'info', variant: 'link', label: t('billing_dismiss') }"
        :description="t('billing_checkout_canceled_desc')"
        @update:open="showCanceledMessage = false"
      />
    </div>

    <!-- Main Content Wrapper -->
    <div class="flex flex-col lg:flex-col gap-8">
      <!-- 2. Subscription Management (Active Sub + Entitlements) -->
      <!-- Show FIRST on mobile, SECOND on desktop (if not premium) -->
      <div
        v-if="!polling"
        class="grid grid-cols-1 lg:grid-cols-3 gap-6"
        :class="{ 'order-2 lg:order-2': !isPremium, 'order-1': isPremium }"
      >
        <!-- Detailed Status Card -->
        <UCard class="lg:col-span-2" :ui="{ body: 'p-4 sm:p-6' }">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">{{ t('billing_active_subscription') }}</h3>
              <UIcon
                :name="getTierIcon(userStore.user?.subscriptionTier)"
                class="w-5 h-5 text-primary"
              />
            </div>
          </template>

          <div class="space-y-6">
            <div class="flex items-start gap-4">
              <div class="p-3 bg-primary/10 rounded-lg">
                <UIcon
                  :name="getTierIcon(userStore.user?.subscriptionTier)"
                  class="w-8 h-8 text-primary"
                />
              </div>
              <div>
                <div class="text-xl font-bold">
                  {{
                    t('billing_plan_name', { tier: formatTier(userStore.user?.subscriptionTier) })
                  }}
                </div>
                <p class="text-sm text-neutral-500">
                  {{ getTierDescription(userStore.user?.subscriptionTier) }}
                </p>
                <!-- Pending Change Indicator -->
                <div
                  v-if="userStore.user?.pendingSubscriptionTier"
                  class="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/5 border border-primary/20 text-xs font-semibold text-primary"
                >
                  <UIcon name="i-heroicons-arrow-path" class="w-3 h-3 animate-spin-slow" />
                  {{
                    t('billing_scheduled_switch_to', {
                      tier: formatTier(userStore.user?.pendingSubscriptionTier)
                    })
                  }}
                </div>
              </div>
            </div>

            <div
              class="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-gray-800"
            >
              <div>
                <dt class="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {{ t('billing_status_label') }}
                </dt>
                <dd class="mt-1 flex items-center gap-2">
                  <UBadge
                    :color="getStatusColor(userStore.user?.subscriptionStatus) as any"
                    variant="subtle"
                  >
                    {{ formatStatus(userStore.user?.subscriptionStatus) }}
                  </UBadge>
                  <UTooltip
                    v-if="userStore.user?.pendingSubscriptionTier"
                    :text="t('billing_pending_change_tooltip')"
                  >
                    <UIcon name="i-heroicons-information-circle" class="w-4 h-4 text-gray-400" />
                  </UTooltip>
                </dd>
              </div>
              <div v-if="userStore.user?.subscriptionPeriodEnd">
                <dt class="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {{
                    userStore.user?.subscriptionStatus === 'CANCELED' ||
                    userStore.user?.pendingSubscriptionTier
                      ? t('billing_access_expires')
                      : t('billing_period_end')
                  }}
                </dt>
                <dd class="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {{ formatDate(userStore.user.subscriptionPeriodEnd) }}
                </dd>
              </div>
              <div v-if="userStore.user?.stripeCustomerId">
                <dt class="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {{ t('billing_customer_id') }}
                </dt>
                <dd class="mt-1 text-xs font-mono text-gray-500">
                  {{ userStore.user.stripeCustomerId }}
                </dd>
              </div>
            </div>
          </div>

          <template #footer>
            <div class="space-y-3">
              <div class="flex flex-wrap gap-3">
                <UButton
                  v-if="
                    userStore.user?.stripeCustomerId && userStore.user?.subscriptionTier !== 'FREE'
                  "
                  color="primary"
                  variant="solid"
                  :loading="loadingPortal"
                  @click="handleManageSubscription"
                >
                  <UIcon name="i-heroicons-cog-6-tooth" class="w-4 h-4" />
                  {{ t('billing_button_portal_manage') }}
                </UButton>

                <!-- New Change Plan Button for Premium Users -->
                <UButton
                  v-if="isPremium"
                  color="primary"
                  variant="soft"
                  @click="showPlansModal = true"
                >
                  <UIcon name="i-heroicons-arrow-path-rounded-square" class="w-4 h-4" />
                  {{ t('billing_button_change_plan') }}
                </UButton>

                <UButton
                  v-if="userStore.user?.stripeCustomerId"
                  color="neutral"
                  variant="outline"
                  :loading="loadingPortal"
                  @click="handleViewInvoices"
                >
                  <UIcon name="i-heroicons-document-text" class="w-4 h-4" />
                  {{ t('billing_button_invoices') }}
                </UButton>

                <UButton color="neutral" variant="ghost" :loading="syncing" @click="handleSync()">
                  <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
                  {{ t('billing_button_sync') }}
                </UButton>

                <p
                  v-if="userStore.user?.subscriptionTier === 'FREE'"
                  class="text-xs text-neutral-500 italic mt-2 w-full"
                >
                  {{ t('billing_subscribe_hint') }}
                </p>
              </div>

              <div
                v-if="userStore.user?.stripeCustomerId"
                class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-500"
              >
                <span>{{ t('billing_portal_hint') }}</span>
                <UButton
                  color="primary"
                  variant="link"
                  class="px-0"
                  :loading="loadingPortal"
                  @click="handleManageSubscription"
                >
                  {{ t('billing_button_portal') }}
                </UButton>
              </div>
            </div>
          </template>
        </UCard>

        <!-- Entitlements Summary -->
        <UCard :ui="{ body: 'p-4 sm:p-6' }">
          <template #header>
            <h3 class="text-lg font-semibold text-center">{{ t('billing_entitlements_title') }}</h3>
          </template>

          <div class="space-y-4">
            <div
              class="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800"
            >
              <span class="text-sm">{{ t('billing_entitlements_sync_mode') }}</span>
              <UBadge :color="entitlements?.autoSync ? 'success' : 'neutral'" size="xs">
                {{
                  entitlements?.autoSync
                    ? t('billing_entitlements_automatic')
                    : t('billing_entitlements_manual')
                }}
              </UBadge>
            </div>
            <div
              class="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800"
            >
              <span class="text-sm">{{ t('billing_entitlements_analysis') }}</span>
              <UBadge :color="entitlements?.autoAnalysis ? 'success' : 'neutral'" size="xs">
                {{
                  entitlements?.autoAnalysis
                    ? t('billing_entitlements_always_on')
                    : t('billing_entitlements_on_demand')
                }}
              </UBadge>
            </div>
            <div
              class="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800"
            >
              <span class="text-sm">{{ t('billing_entitlements_ai_engine') }}</span>
              <UBadge :color="entitlements?.aiModel === 'pro' ? 'primary' : 'info'" size="xs">
                {{
                  entitlements?.aiModel === 'pro'
                    ? t('billing_feature_deep')
                    : t('billing_feature_standard')
                }}
              </UBadge>
            </div>
            <div
              class="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800"
            >
              <span class="text-sm">{{ t('billing_entitlements_priority') }}</span>
              <UBadge :color="entitlements?.priorityProcessing ? 'success' : 'neutral'" size="xs">
                {{
                  entitlements?.priorityProcessing
                    ? t('billing_feature_yes')
                    : t('billing_feature_no')
                }}
              </UBadge>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm">{{ t('billing_entitlements_proactive_ai') }}</span>
              <UBadge :color="entitlements?.proactivity ? 'success' : 'neutral'" size="xs">
                {{ entitlements?.proactivity ? t('billing_feature_yes') : t('billing_feature_no') }}
              </UBadge>
            </div>
          </div>
        </UCard>
      </div>

      <!-- 1. Pricing & Comparison -->
      <!-- Show ONLY if NOT premium (or in modal) -->
      <div
        v-if="!isPremium && !showSuccessMessage"
        class="space-y-4 order-1 lg:order-1 pt-8 lg:pt-0 border-t lg:border-t-0 border-gray-200 dark:border-gray-800"
      >
        <div class="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
          <h3 class="text-2xl font-black uppercase tracking-tight">
            {{ t('billing_plans_title') }}
          </h3>
          <p
            v-if="userStore.user?.subscriptionTier !== 'PRO'"
            class="text-sm text-primary font-medium"
          >
            {{ t('billing_button_upgrade') }}
          </p>
        </div>

        <div class="pb-6 sm:pb-8">
          <LandingPricingPlans conversion-goal="pro" @close="showPlansModal = false" />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div
            v-for="item in billingTrustSignals"
            :key="item.title"
            class="rounded-lg border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900"
          >
            <div class="flex items-start gap-3">
              <UIcon :name="item.icon" class="w-5 h-5 text-primary mt-0.5" />
              <div>
                <div class="text-sm font-semibold">{{ item.title }}</div>
                <p class="text-xs text-gray-600 dark:text-gray-300 mt-1">{{ item.description }}</p>
              </div>
            </div>
          </div>
        </div>

        <details class="billing-details rounded-lg border border-gray-200 dark:border-gray-800">
          <summary
            class="billing-summary cursor-pointer list-none px-4 py-3 text-sm font-semibold flex items-center justify-between"
          >
            {{ t('billing_compare_header') }}
            <UIcon name="i-heroicons-chevron-down" class="billing-chevron w-4 h-4 text-gray-500" />
          </summary>
          <div class="billing-details-content">
            <div class="billing-details-inner px-4 pb-4 overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left border-b border-gray-200 dark:border-gray-800">
                    <th class="py-2 font-semibold">{{ t('billing_compare_feature') }}</th>
                    <th class="py-2 font-semibold">{{ t('billing_tier_free') }}</th>
                    <th class="py-2 font-semibold">{{ t('billing_tier_supporter') }}</th>
                    <th class="py-2 font-semibold text-primary">{{ t('billing_tier_pro') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in billingComparisonRows"
                    :key="row.feature"
                    class="border-b border-gray-100 dark:border-gray-900"
                  >
                    <td class="py-2 font-medium">{{ row.feature }}</td>
                    <td class="py-2 text-gray-600 dark:text-gray-300">{{ row.free }}</td>
                    <td class="py-2 text-gray-600 dark:text-gray-300">{{ row.supporter }}</td>
                    <td class="py-2 text-primary font-medium">{{ row.pro }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </details>

        <UCard :ui="{ body: 'p-4 sm:p-6' }">
          <template #header>
            <h4 class="text-base font-semibold">{{ t('billing_faq_header') }}</h4>
          </template>
          <div class="divide-y divide-gray-200 dark:divide-gray-800">
            <details v-for="item in billingFaqs" :key="item.question" class="billing-faq-item py-3">
              <summary
                class="billing-summary cursor-pointer list-none text-sm font-medium flex items-center justify-between gap-2"
              >
                <span>{{ item.question }}</span>
                <UIcon
                  name="i-heroicons-chevron-down"
                  class="billing-chevron w-4 h-4 text-gray-500 shrink-0"
                />
              </summary>
              <div class="billing-faq-content">
                <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">{{ item.answer }}</p>
              </div>
            </details>
          </div>
        </UCard>

        <!-- Maintenance Message when Subscriptions are Disabled -->
        <div v-if="!subscriptionsEnabled" class="mt-4">
          <UAlert
            icon="i-heroicons-information-circle"
            color="info"
            variant="soft"
            :title="t('billing_unavailable_title')"
            :description="t('billing_unavailable_desc')"
          />
        </div>
      </div>
    </div>

    <!-- Change Plan Modal -->
    <UModal
      v-model:open="showPlansModal"
      :ui="{ content: 'sm:max-w-6xl', body: 'p-0' }"
      :title="t('billing_modal_title')"
      :description="t('billing_modal_desc')"
    >
      <template #content>
        <div class="max-h-[85vh] overflow-y-auto overscroll-y-contain">
          <UCard :ui="{ body: 'p-5 sm:p-6 lg:p-7' }">
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-xl font-bold">{{ t('billing_modal_change_title') }}</h3>
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-x-mark"
                  @click="showPlansModal = false"
                />
              </div>
            </template>

            <SettingsBillingPlans conversion-goal="pro" @close="showPlansModal = false" />

            <div v-if="!subscriptionsEnabled" class="mt-8">
              <UAlert
                icon="i-heroicons-information-circle"
                color="info"
                variant="soft"
                :title="t('billing_unavailable_title')"
                :description="t('billing_unavailable_modal_desc')"
              />
            </div>
          </UCard>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
  .success-confetti-piece {
    --drift-x: 0px;
    --delay: 0ms;
    --duration: 1400ms;
    --rotation: 0deg;
    --scale: 1;
    --color: #60a5fa;
    position: absolute;
    bottom: -1rem;
    width: 0.52rem;
    height: 0.94rem;
    border-radius: 9999px;
    background: var(--color);
    opacity: 0;
    animation: billing-success-confetti var(--duration) ease-out var(--delay) forwards;
  }

  @keyframes billing-success-confetti {
    0% {
      transform: translateY(0) rotate(0deg) scale(0.85);
      opacity: 0;
    }
    12% {
      opacity: 1;
    }
    100% {
      transform: translate3d(var(--drift-x), -220px, 0) rotate(var(--rotation)) scale(var(--scale));
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .success-confetti-piece {
      animation: none;
    }

    .billing-details-content,
    .billing-faq-content,
    .billing-chevron,
    .billing-summary {
      transition: none !important;
    }
  }

  .billing-summary {
    transition: color 180ms ease;
  }

  .billing-summary:hover {
    color: rgb(59 130 246);
  }

  .billing-details-content,
  .billing-faq-content {
    display: grid;
    grid-template-rows: 0fr;
    opacity: 0.6;
    transition:
      grid-template-rows 220ms ease,
      opacity 200ms ease;
  }

  .billing-details[open] .billing-details-content,
  .billing-faq-item[open] .billing-faq-content {
    grid-template-rows: 1fr;
    opacity: 1;
  }

  .billing-details-inner,
  .billing-faq-content > p {
    overflow: hidden;
  }

  .billing-chevron {
    transition: transform 200ms ease;
  }

  .billing-details[open] .billing-chevron,
  .billing-faq-item[open] .billing-chevron {
    transform: rotate(180deg);
  }

  @keyframes pulse-subtle {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.92;
      transform: scale(0.995);
    }
  }

  .animate-pulse-subtle {
    animation: pulse-subtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  .animate-spin-slow {
    animation: spin 3s linear infinite;
  }
</style>
