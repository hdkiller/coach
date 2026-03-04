<script setup lang="ts">
  import { format } from 'date-fns'
  import { useTranslate } from '@tolgee/vue'
  import type { SubscriptionStatus, SubscriptionTier } from '@prisma/client'

  const { t } = useTranslate('settings')

  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'Billing & Subscription',
    meta: [
      {
        name: 'description',
        content: 'Manage your subscription and billing information.'
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
    return name ? name.split(' ')[0] : 'Athlete'
  })

  // Always refresh user data on mount to ensure latest subscription status.
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
    if (event.persisted) {
      handleSync(true)
    }
  }

  function handleFocus() {
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
        await $fetch('/api/stripe/sync', { method: 'POST' })
        await userStore.fetchUser(true)

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

  const billingTrustSignals = computed(() => [
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
  ])

  const billingComparisonRows = computed(() => [
    {
      feature: t.value('billing_feature_analysis'),
      free: 'Quick',
      supporter: 'Quick + automation',
      pro: 'Thoughtful + scenario planning'
    },
    {
      feature: 'Analysis timing',
      free: 'On demand',
      supporter: 'Always on',
      pro: 'Always on + proactive alerts'
    },
    {
      feature: 'Planning support',
      free: 'Basic',
      supporter: 'Weekly summaries',
      pro: 'Adaptive race strategy'
    },
    {
      feature: 'Insights horizon',
      free: 'Recent trends',
      supporter: 'Weekly trends',
      pro: 'Long-horizon forecasting'
    }
  ])

  const billingFaqs = computed(() => [
    {
      question: 'Can I cancel anytime?',
      answer:
        'Yes. You can cancel from the billing portal at any time and your plan will remain active through the paid period.'
    },
    {
      question: 'What happens when I downgrade?',
      answer:
        'Your account returns to Free features, but your workouts, history, and connected data remain available.'
    },
    {
      question: 'What makes Pro different from Supporter?',
      answer:
        'Pro adds deeper coaching intelligence, scenario planning, proactive readiness alerts, and advanced long-horizon insights.'
    },
    {
      question: 'Do upgrades apply immediately?',
      answer:
        'Yes. Upgrades are applied right away and Stripe handles prorated billing automatically.'
    }
  ])

  // Methods
  function formatStatus(status: SubscriptionStatus | undefined): string {
    if (!status) return t.value('billing_status_none')
    if (status === 'CONTRIBUTOR') return t.value('billing_status_contributor')

    const key = `billing_status_${status.toLowerCase()}`
    return t.value(key)
  }

  function formatTier(tier: SubscriptionTier | undefined): string {
    if (!tier) return t.value('billing_tier_free')
    const key = `billing_tier_${tier.toLowerCase()}`
    return t.value(key)
  }

  async function handleSync(silent = false) {
    if (!silent) syncing.value = true
    try {
      await $fetch('/api/stripe/sync', { method: 'POST' })
      await userStore.fetchUser(true)
      if (!silent) {
        toast.add({
          title: t.value('billing_sync_success_title'),
          description: t.value('billing_sync_success_desc'),
          color: 'success'
        })
      }
    } catch (e) {
      if (!silent) {
        toast.add({
          title: 'Sync failed',
          description: 'Could not update subscription status.',
          color: 'error'
        })
      }
    } finally {
      syncing.value = false
    }
  }

  async function handlePortal() {
    loadingPortal.value = true
    try {
      await openCustomerPortal()
    } catch (e: any) {
      toast.add({
        title: 'Error',
        description: e.message || 'Could not open billing portal.',
        color: 'error'
      })
    } finally {
      loadingPortal.value = false
    }
  }

  function triggerCelebration() {
    if (celebrationPlayed.value || prefersReducedMotion.value) return
    celebrationPlayed.value = true

    const colors = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#10b981', '#fbbf24']
    const newConfetti = []

    for (let i = 0; i < 40; i++) {
      newConfetti.push({
        id: i,
        left: Math.random() * 100,
        driftX: (Math.random() - 0.5) * 150,
        delay: Math.random() * 600,
        duration: 1000 + Math.random() * 800,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.8,
        color: colors[Math.floor(Math.random() * colors.length)]
      })
    }

    confettiPieces.value = newConfetti
    setTimeout(() => {
      confettiPieces.value = []
    }, 3000)
  }
</script>

<template>
  <div class="space-y-6">
    <!-- Success Message Overlay -->
    <div v-if="showSuccessMessage" class="mb-6 relative">
      <div
        v-for="p in confettiPieces"
        :key="p.id"
        class="success-confetti-piece z-50 pointer-events-none"
        :style="{
          left: `${p.left}%`,
          '--drift-x': `${p.driftX}px`,
          '--delay': `${p.delay}ms`,
          '--duration': `${p.duration}ms`,
          '--rotation': `${p.rotation}deg`,
          '--scale': p.scale,
          '--color': p.color
        }"
      />

      <UAlert
        color="success"
        variant="subtle"
        icon="i-heroicons-sparkles"
        title="Congratulations! Your plan is now active."
        description="Thank you for supporting Coach Watts. Your premium features are now unlocked and ready to use."
        :close="{
          icon: 'i-heroicons-x-mark-20-solid',
          color: 'success',
          variant: 'ghost',
          onClick: () => (showSuccessMessage = false)
        }"
      >
        <template #actions>
          <UButton color="success" variant="solid" size="xs" to="/dashboard"
            >Go to Dashboard</UButton
          >
        </template>
      </UAlert>
    </div>

    <UCard :ui="{ body: 'hidden' }">
      <template #header>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold uppercase tracking-tight">{{ t('billing_header') }}</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ t('billing_description') }}
            </p>
          </div>
          <UButton
            icon="i-heroicons-arrow-path"
            color="neutral"
            variant="ghost"
            size="sm"
            :loading="syncing"
            @click="handleSync(false)"
          />
        </div>
      </template>
    </UCard>

    <!-- Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <!-- Left: Active Subscription Info -->
      <div class="space-y-6 order-2 lg:order-1">
        <UCard v-if="userStore.user" :ui="{ body: 'space-y-6' }">
          <template #header>
            <div class="flex items-center gap-3">
              <UAvatar :alt="userStore.user.name || '?'" size="lg" />
              <div>
                <h3 class="text-lg font-bold">{{ t('billing_welcome', { name: welcomeName }) }}</h3>
                <p class="text-xs text-gray-500">{{ userStore.user.email }}</p>
              </div>
            </div>
          </template>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              class="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800"
            >
              <div class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                {{ t('billing_status_label') }}
              </div>
              <div class="flex items-center gap-2">
                <div
                  class="w-2 h-2 rounded-full"
                  :class="
                    userStore.user.subscriptionStatus === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-400'
                  "
                />
                <span class="text-sm font-bold uppercase">{{
                  formatStatus(userStore.user.subscriptionStatus)
                }}</span>
              </div>
            </div>

            <div
              class="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800"
            >
              <div class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                {{ t('billing_tier_label') }}
              </div>
              <div class="text-sm font-bold uppercase">
                {{ formatTier(userStore.user.subscriptionTier) }}
              </div>
            </div>

            <div
              v-if="userStore.user.subscriptionPeriodEnd"
              class="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800"
            >
              <div class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                {{ t('billing_period_end') }}
              </div>
              <div class="text-sm font-bold">
                {{ format(new Date(userStore.user.subscriptionPeriodEnd), 'MMM d, yyyy') }}
              </div>
            </div>
          </div>

          <div class="flex flex-wrap gap-3">
            <UButton
              v-if="userStore.user.stripeCustomerId"
              color="neutral"
              variant="solid"
              icon="i-heroicons-arrow-top-right-on-square"
              :loading="loadingPortal"
              @click="handlePortal"
            >
              {{ t('billing_button_portal') }}
            </UButton>
            <UButton
              color="primary"
              variant="outline"
              icon="i-heroicons-sparkles"
              @click="showPlansModal = true"
            >
              {{ t('billing_button_change_plan') }}
            </UButton>
          </div>
        </UCard>

        <UCard v-if="entitlements" :ui="{ body: 'p-4' }">
          <template #header>
            <h4 class="text-sm font-black uppercase tracking-widest text-gray-400">
              Current Entitlements
            </h4>
          </template>
          <div class="space-y-3">
            <div
              class="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800"
            >
              <span class="text-sm">{{ t('billing_feature_auto_sync') }}</span>
              <UBadge :color="entitlements.autoSync ? 'success' : 'neutral'" size="xs">
                {{
                  entitlements.autoSync
                    ? t('billing_feature_automatic')
                    : t('billing_feature_manual')
                }}
              </UBadge>
            </div>
            <div
              class="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800"
            >
              <span class="text-sm">{{ t('billing_feature_analysis') }}</span>
              <UBadge :color="entitlements.autoAnalysis ? 'success' : 'neutral'" size="xs">
                {{
                  entitlements.autoAnalysis
                    ? t('billing_feature_always_on')
                    : t('billing_feature_on_demand')
                }}
              </UBadge>
            </div>
            <div
              class="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800"
            >
              <span class="text-sm">{{ t('billing_feature_ai_engine') }}</span>
              <UBadge :color="entitlements.aiModel === 'pro' ? 'primary' : 'info'" size="xs">
                {{
                  entitlements.aiModel === 'pro'
                    ? t('billing_feature_deep')
                    : t('billing_feature_standard')
                }}
              </UBadge>
            </div>
            <div
              class="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800"
            >
              <span class="text-sm">{{ t('billing_feature_priority') }}</span>
              <UBadge :color="entitlements.priorityProcessing ? 'success' : 'neutral'" size="xs">
                {{
                  entitlements.priorityProcessing
                    ? t('billing_feature_yes')
                    : t('billing_feature_no')
                }}
              </UBadge>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm">{{ t('billing_feature_proactive') }}</span>
              <UBadge :color="entitlements.proactivity ? 'success' : 'neutral'" size="xs">
                {{ entitlements.proactivity ? t('billing_feature_yes') : t('billing_feature_no') }}
              </UBadge>
            </div>
          </div>
        </UCard>
      </div>

      <!-- 1. Pricing & Comparison -->
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

        <LandingPricingPlans
          conversion-goal="pro"
          is-billing-page
          @close="showPlansModal = false"
        />

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
                    <th class="py-2 font-semibold">Feature</th>
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
      :ui="{ content: 'sm:max-w-5xl' }"
      title="Coach Watts Subscription Plans"
      description="Explore our tiered subscription options and find the plan that best fits your training needs."
    >
      <template #content>
        <UCard :ui="{ body: 'p-6 sm:p-8' }">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-xl font-bold">Change Your Plan</h3>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-heroicons-x-mark"
                @click="showPlansModal = false"
              />
            </div>
          </template>

          <LandingPricingPlans
            conversion-goal="pro"
            is-billing-page
            @close="showPlansModal = false"
          />

          <div v-if="!subscriptionsEnabled" class="mt-8">
            <UAlert
              icon="i-heroicons-information-circle"
              color="info"
              variant="soft"
              :title="t('billing_unavailable_title')"
              :description="t('billing_unavailable_desc')"
            />
          </div>
        </UCard>
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
