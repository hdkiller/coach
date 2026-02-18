<script setup lang="ts">
  import { format } from 'date-fns'
  import type { SubscriptionStatus, SubscriptionTier } from '@prisma/client'

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
  // After a successful checkout, also sync with Stripe so the webhook delay
  // doesn't leave the user looking at the upgrade plans.
  onMounted(async () => {
    if (import.meta.client) {
      prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }

    if (showSuccessMessage.value) {
      await pollSubscription()
      triggerCelebration()
    } else {
      await userStore.fetchUser()
    }
  })

  const polling = ref(false)
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
        await userStore.fetchUser()

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

  // Methods
  function formatStatus(status: SubscriptionStatus | undefined): string {
    if (!status) return 'None'
    if (status === 'CONTRIBUTOR') return 'Contributor'
    return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ')
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
    if (!tier) return 'Free'
    return tier.charAt(0) + tier.slice(1).toLowerCase()
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
        return 'Your full-service Digital Twin and Coach.'
      case 'SUPPORTER':
        return 'Automated insights for the self-coached athlete.'
      default:
        return "The smartest logbook you've ever used."
    }
  }

  function formatDate(date: string | Date | undefined): string {
    if (!date) return 'N/A'
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

  async function handleSync() {
    syncing.value = true
    try {
      await $fetch('/api/stripe/sync', { method: 'POST' })
      await userStore.fetchUser()

      const toast = useToast()
      toast.add({
        title: 'Subscription Synced',
        description: 'Your subscription status has been updated from Stripe.',
        color: 'success'
      })
    } catch (e) {
      const toast = useToast()
      toast.add({
        title: 'Sync Failed',
        description: 'Could not sync subscription status. Please try again later.',
        color: 'error'
      })
    } finally {
      syncing.value = false
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
    <UCard :ui="{ body: 'hidden' }">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold uppercase tracking-tight">Billing & Subscription</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Manage your subscription and billing information.
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
              <UBadge color="success" variant="soft" size="sm">Upgrade complete</UBadge>
              <h3 class="text-2xl font-bold">
                Welcome, {{ welcomeName }}. Your AI Coach is now fully unlocked.
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-300">
                Set your preferences once, then let coaching run automatically.
              </p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark"
              aria-label="Dismiss success message"
              @click="dismissSuccessMessage"
            />
          </div>

          <div class="grid gap-2 sm:grid-cols-3">
            <div class="rounded-lg border border-success/20 bg-success/5 p-3">
              <div class="text-xs uppercase tracking-wide text-success">Automations</div>
              <div class="text-sm font-semibold">
                Turn on auto-analysis for workouts, nutrition, and readiness.
              </div>
            </div>
            <div class="rounded-lg border border-success/20 bg-success/5 p-3">
              <div class="text-xs uppercase tracking-wide text-success">Model Controls</div>
              <div class="text-sm font-semibold">
                Pick Quick, Thoughtful, or Experimental reasoning.
              </div>
            </div>
            <div class="rounded-lg border border-success/20 bg-success/5 p-3">
              <div class="text-xs uppercase tracking-wide text-success">Proactive Coaching</div>
              <div class="text-sm font-semibold">Enable alerts and forward-looking guidance.</div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <UButton
              to="/settings/ai?success=true"
              color="primary"
              icon="i-heroicons-sparkles"
              trailing-icon="i-heroicons-arrow-right"
            >
              Open AI Settings
            </UButton>
            <UButton color="neutral" variant="ghost" @click="dismissSuccessMessage">
              Dismiss
            </UButton>
          </div>

          <div class="space-y-2">
            <div class="text-xs uppercase tracking-wide text-gray-500">Quick start checklist</div>
            <div class="space-y-1 text-sm">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-check-circle" class="h-4 w-4 text-success" />
                <span>Subscription activated</span>
              </div>
              <div class="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <UIcon name="i-heroicons-circle-stack" class="h-4 w-4" />
                <span>Review AI settings presets</span>
              </div>
              <div class="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <UIcon name="i-heroicons-cpu-chip" class="h-4 w-4" />
                <span>Enable one automation to start</span>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <UAlert
        v-if="showSuccessMessage && polling"
        title="Confirming Subscription..."
        color="info"
        variant="soft"
        :close="{ color: 'info', variant: 'link', label: 'Dismiss' }"
        description="We are verifying your payment with Stripe. This may take a few seconds..."
        @update:open="dismissSuccessMessage"
      >
        <template #icon>
          <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin" />
        </template>
      </UAlert>

      <UAlert
        v-if="showCanceledMessage"
        title="Checkout Canceled"
        icon="i-heroicons-information-circle"
        color="info"
        variant="soft"
        :close="{ color: 'info', variant: 'link', label: 'Dismiss' }"
        description="You can upgrade anytime by selecting a plan below."
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
        :class="{ 'order-1 lg:order-2': !isPremium, 'order-1': isPremium }"
      >
        <!-- Detailed Status Card -->
        <UCard class="lg:col-span-2" :ui="{ body: 'p-4 sm:p-6' }">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">Active Subscription</h3>
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
                  {{ formatTier(userStore.user?.subscriptionTier) }} Plan
                </div>
                <p class="text-sm text-neutral-500">
                  {{ getTierDescription(userStore.user?.subscriptionTier) }}
                </p>
              </div>
            </div>

            <div
              class="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-gray-800"
            >
              <div>
                <dt class="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</dt>
                <dd class="mt-1">
                  <UBadge
                    :color="getStatusColor(userStore.user?.subscriptionStatus) as any"
                    variant="subtle"
                  >
                    {{ formatStatus(userStore.user?.subscriptionStatus) }}
                  </UBadge>
                </dd>
              </div>
              <div v-if="userStore.user?.subscriptionPeriodEnd">
                <dt class="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {{
                    userStore.user?.subscriptionStatus === 'CANCELED'
                      ? 'Access Expires'
                      : 'Next Billing Date'
                  }}
                </dt>
                <dd class="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {{ formatDate(userStore.user.subscriptionPeriodEnd) }}
                </dd>
              </div>
              <div v-if="userStore.user?.stripeCustomerId">
                <dt class="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Customer ID
                </dt>
                <dd class="mt-1 text-xs font-mono text-gray-500">
                  {{ userStore.user.stripeCustomerId }}
                </dd>
              </div>
            </div>
          </div>

          <template #footer>
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
                Manage
              </UButton>

              <!-- New Change Plan Button for Premium Users -->
              <UButton
                v-if="isPremium"
                color="primary"
                variant="soft"
                @click="showPlansModal = true"
              >
                <UIcon name="i-heroicons-arrow-path-rounded-square" class="w-4 h-4" />
                Change Plan
              </UButton>

              <UButton
                v-if="userStore.user?.stripeCustomerId"
                color="neutral"
                variant="outline"
                :loading="loadingPortal"
                @click="handleViewInvoices"
              >
                <UIcon name="i-heroicons-document-text" class="w-4 h-4" />
                Invoices
              </UButton>

              <UButton color="neutral" variant="ghost" :loading="syncing" @click="handleSync">
                <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
                Sync
              </UButton>

              <p
                v-if="userStore.user?.subscriptionTier === 'FREE'"
                class="text-xs text-neutral-500 italic mt-2 w-full"
              >
                Subscribe to a plan below to manage billing.
              </p>
            </div>
          </template>
        </UCard>

        <!-- Entitlements Summary -->
        <UCard :ui="{ body: 'p-4 sm:p-6' }">
          <template #header>
            <h3 class="text-lg font-semibold text-center">Your Entitlements</h3>
          </template>

          <div class="space-y-4">
            <div
              class="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800"
            >
              <span class="text-sm">Sync Mode</span>
              <UBadge :color="entitlements?.autoSync ? 'success' : 'neutral'" size="xs">
                {{ entitlements?.autoSync ? 'Automatic' : 'Manual' }}
              </UBadge>
            </div>
            <div
              class="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800"
            >
              <span class="text-sm">Analysis</span>
              <UBadge :color="entitlements?.autoAnalysis ? 'success' : 'neutral'" size="xs">
                {{ entitlements?.autoAnalysis ? 'Always-On' : 'On-Demand' }}
              </UBadge>
            </div>
            <div
              class="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800"
            >
              <span class="text-sm">AI Engine</span>
              <UBadge :color="entitlements?.aiModel === 'pro' ? 'primary' : 'info'" size="xs">
                {{ entitlements?.aiModel === 'pro' ? 'Deep' : 'Standard' }}
              </UBadge>
            </div>
            <div
              class="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800"
            >
              <span class="text-sm">Priority</span>
              <UBadge :color="entitlements?.priorityProcessing ? 'success' : 'neutral'" size="xs">
                {{ entitlements?.priorityProcessing ? 'Yes' : 'No' }}
              </UBadge>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm">Proactive AI</span>
              <UBadge :color="entitlements?.proactivity ? 'success' : 'neutral'" size="xs">
                {{ entitlements?.proactivity ? 'Yes' : 'No' }}
              </UBadge>
            </div>
          </div>
        </UCard>
      </div>

      <!-- 1. Pricing & Comparison -->
      <!-- Show ONLY if NOT premium (or in modal) -->
      <div
        v-if="!isPremium && !showSuccessMessage"
        class="space-y-4 order-2 lg:order-1 pt-8 lg:pt-0 border-t lg:border-t-0 border-gray-200 dark:border-gray-800"
      >
        <div class="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
          <h3 class="text-xl font-bold">Subscription Plans</h3>
          <p
            v-if="userStore.user?.subscriptionTier !== 'PRO'"
            class="text-sm text-primary font-medium"
          >
            Upgrade to unlock advanced features
          </p>
        </div>

        <LandingPricingPlans />

        <!-- Maintenance Message when Subscriptions are Disabled -->
        <div v-if="!subscriptionsEnabled" class="mt-4">
          <UAlert
            icon="i-heroicons-information-circle"
            color="info"
            variant="soft"
            title="Subscriptions Temporarily Unavailable"
            description="We are currently performing maintenance on our subscription system. New subscriptions and plan changes are temporarily disabled, but existing subscriptions remain active and functional."
          />
        </div>
      </div>
    </div>

    <!-- Change Plan Modal -->
    <UModal
      v-model:open="showPlansModal"
      :ui="{ content: 'sm:max-w-5xl' }"
      title="Dialog"
      description="Dialog content and actions."
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

          <LandingPricingPlans />

          <div v-if="!subscriptionsEnabled" class="mt-8">
            <UAlert
              icon="i-heroicons-information-circle"
              color="info"
              variant="soft"
              title="Subscriptions Temporarily Unavailable"
              description="New plan selections and changes are temporarily disabled while we perform system maintenance. Existing subscriptions remain active."
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
  }
</style>
