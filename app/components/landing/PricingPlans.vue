<template>
  <div class="space-y-8">
    <div class="flex flex-wrap justify-center items-center gap-4">
      <div class="inline-flex items-center gap-3 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        <button
          class="px-4 py-2 rounded-md text-sm font-medium transition-all"
          :class="
            billingInterval === 'monthly'
              ? 'bg-white dark:bg-gray-900 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          "
          @click="billingInterval = 'monthly'"
        >
          Monthly
        </button>
        <button
          class="px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2"
          :class="
            billingInterval === 'annual'
              ? 'bg-white dark:bg-gray-900 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          "
          @click="billingInterval = 'annual'"
        >
          Annual
          <span
            class="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full"
          >
            Save 33%
          </span>
        </button>
      </div>

      <div class="inline-flex items-center gap-3 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        <button
          class="px-4 py-2 rounded-md text-sm font-medium transition-all"
          :class="
            currency === 'usd'
              ? 'bg-white dark:bg-gray-900 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          "
          @click="setCurrency('usd')"
        >
          $ USD
        </button>
        <button
          class="px-4 py-2 rounded-md text-sm font-medium transition-all"
          :class="
            currency === 'eur'
              ? 'bg-white dark:bg-gray-900 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          "
          @click="setCurrency('eur')"
        >
          € EUR
        </button>
      </div>
    </div>

    <div
      class="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 items-stretch"
      :class="
        props.conversionGoal === 'pro'
          ? 'lg:[grid-template-columns:minmax(0,0.96fr)_minmax(0,1.08fr)_minmax(0,0.96fr)] xl:[grid-template-columns:minmax(0,0.94fr)_minmax(0,1.12fr)_minmax(0,0.94fr)]'
          : ''
      "
    >
      <UCard
        v-for="plan in displayedPlans"
        :key="plan.key"
        class="flex flex-col relative overflow-hidden h-full min-w-0 transform-gpu will-change-transform transition-transform transition-shadow transition-colors duration-200 ease-out motion-reduce:transition-none"
        :class="[
          getCardClass(plan),
          getPlanOrderClass(plan),
          isCardClickable(plan)
            ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:scale-[0.995]'
            : ''
        ]"
        :tabindex="isCardClickable(plan) ? 0 : -1"
        :role="isCardClickable(plan) ? 'button' : undefined"
        :aria-disabled="isCardClickable(plan) ? false : undefined"
        :ui="{ body: 'flex-grow flex flex-col p-4 sm:p-6' }"
        @click="onCardClick(plan, $event)"
        @keydown.enter.prevent="onCardActivate(plan, $event)"
        @keydown.space.prevent="onCardActivate(plan, $event)"
      >
        <div
          v-if="getPlanBadge(plan)"
          class="absolute top-0 right-0 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wide"
          :class="isPrimaryPlan(plan) ? 'bg-primary' : 'bg-gray-700 dark:bg-gray-600'"
        >
          {{ getPlanBadge(plan) }}
        </div>

        <div
          v-if="isCurrentPlan(plan)"
          class="absolute top-0 left-0 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-br-lg uppercase tracking-wide"
        >
          Current Plan
        </div>

        <template #header>
          <h3 class="text-xl font-bold">{{ plan.name }}</h3>

          <div class="mt-4">
            <div class="flex items-baseline gap-1">
              <span class="text-4xl font-extrabold">
                {{
                  formatPrice(
                    billingInterval === 'annual' && plan.annualPrice
                      ? plan.annualPrice
                      : plan.monthlyPrice,
                    currency
                  )
                }}
              </span>
              <span class="text-sm text-gray-500 dark:text-gray-400">
                {{
                  plan.key === 'free' ? '' : `/ ${billingInterval === 'annual' ? 'year' : 'month'}`
                }}
              </span>
            </div>

            <div class="mt-2 min-h-[2.75rem] flex flex-col justify-center gap-1">
              <template v-if="billingInterval === 'annual' && plan.annualPrice">
                <div class="text-xs text-gray-600 dark:text-gray-300">
                  {{ formatPrice(getEffectiveMonthly(plan), currency) }}/mo billed annually
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-500 line-through">
                    {{ formatPrice(plan.monthlyPrice, currency) }}/mo
                  </span>
                  <span
                    class="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    :class="
                      isPrimaryPlan(plan)
                        ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                    "
                  >
                    Save {{ calculateAnnualSavings(plan) }}%
                  </span>
                </div>
              </template>
              <template v-else-if="plan.key !== 'free'">
                <div class="text-xs text-gray-600 dark:text-gray-300">Billed monthly</div>
              </template>
            </div>
          </div>

          <p class="mt-3 text-sm text-gray-500 dark:text-gray-400 min-h-[3.5rem]">
            {{ plan.description }}
          </p>
        </template>

        <ul class="space-y-3 flex-grow flex flex-col justify-start min-h-[12rem]">
          <li
            v-for="(feature, fIndex) in plan.features"
            :key="fIndex"
            class="flex items-start gap-2 text-sm"
          >
            <UIcon
              name="i-heroicons-check"
              class="w-5 h-5 flex-shrink-0"
              :class="isPrimaryPlan(plan) ? 'text-primary' : 'text-gray-500 dark:text-gray-400'"
            />
            <span>{{ feature }}</span>
          </li>
        </ul>

        <div class="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 space-y-2">
          <UButton
            :color="getButtonStyle(plan).color"
            :variant="getButtonStyle(plan).variant"
            block
            :disabled="
              isCurrentPlan(plan) ||
              loading ||
              (status === 'authenticated' && !subscriptionsEnabled && plan.key !== 'free')
            "
            :loading="loading && selectedPlan === plan.key"
            @click.stop="handlePlanSelect(plan)"
          >
            {{
              subscriptionsEnabled || plan.key === 'free' || status !== 'authenticated'
                ? getButtonLabel(plan)
                : 'Temporarily Unavailable'
            }}
          </UButton>
          <p
            class="text-[11px] text-center text-gray-500 dark:text-gray-400 min-h-[1rem]"
            :class="plan.key === 'free' && !isCurrentPlan(plan) ? 'opacity-0' : ''"
          >
            Cancel anytime. Instant downgrade to Free.
          </p>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
  import {
    PRICING_PLANS,
    calculateAnnualSavings,
    formatPrice,
    getStripePriceId,
    type BillingInterval,
    type PricingPlan,
    type PricingTier
  } from '~/utils/pricing'

  type ConversionGoal = Exclude<PricingTier, 'free'>

  const props = withDefaults(
    defineProps<{
      conversionGoal?: ConversionGoal
      isBillingPage?: boolean
    }>(),
    {
      conversionGoal: 'supporter',
      isBillingPage: false
    }
  )

  const { status } = useAuth()
  const userStore = useUserStore()
  const { createCheckoutSession, openCustomerPortal } = useStripe()
  const { currency, setCurrency } = useCurrency()
  const config = useRuntimeConfig()

  const billingInterval = ref<BillingInterval>('monthly')
  const loading = ref(false)
  const selectedPlan = ref<string | null>(null)
  const subscriptionsEnabled = computed(() => config.public.subscriptionsEnabled)

  const displayedPlans = computed(() => {
    const planByKey = new Map(PRICING_PLANS.map((plan) => [plan.key, plan]))
    const orderedKeys: PricingTier[] =
      props.conversionGoal === 'pro' ? ['pro', 'supporter', 'free'] : ['free', 'supporter', 'pro']

    return orderedKeys
      .map((key) => planByKey.get(key))
      .filter((plan): plan is PricingPlan => Boolean(plan))
  })

  function isCurrentPlan(plan: PricingPlan): boolean {
    if (!userStore.user || status.value !== 'authenticated') return false
    const currentTier = userStore.user.subscriptionTier?.toLowerCase()
    return currentTier === plan.key
  }

  function isPrimaryPlan(plan: PricingPlan): boolean {
    return plan.key === props.conversionGoal
  }

  function isAnchorPlan(plan: PricingPlan): boolean {
    return props.conversionGoal === 'pro' && plan.key === 'supporter'
  }

  function getPlanBadge(plan: PricingPlan): string | null {
    if (isPrimaryPlan(plan)) {
      return props.conversionGoal === 'pro' ? 'Best value' : 'Most popular'
    }

    if (isAnchorPlan(plan)) {
      return 'Smart start'
    }

    return null
  }

  function getCardClass(plan: PricingPlan): string {
    if (isPrimaryPlan(plan)) {
      return 'ring-2 ring-primary border-primary shadow-xl'
    }

    if (isAnchorPlan(plan)) {
      return 'ring-1 ring-gray-200 dark:ring-gray-700 border-gray-200 dark:border-gray-700'
    }

    return 'opacity-95 hover:opacity-100'
  }

  function isCardClickable(plan: PricingPlan): boolean {
    if (plan.key === 'free') return false
    if (isCurrentPlan(plan)) return false
    if (loading.value) return false
    if (status.value === 'authenticated' && !subscriptionsEnabled.value) return false
    return true
  }

  function onCardActivate(plan: PricingPlan, event: KeyboardEvent) {
    if (!isCardClickable(plan)) return
    const target = event.target as HTMLElement | null
    if (target?.closest('button, a, input, select, textarea, summary, details')) return
    handlePlanSelect(plan)
  }

  function onCardClick(plan: PricingPlan, event: MouseEvent) {
    if (!isCardClickable(plan)) return
    const target = event.target as HTMLElement | null
    if (target?.closest('button, a, input, select, textarea, summary, details')) return
    handlePlanSelect(plan)
  }

  function getPlanOrderClass(plan: PricingPlan): string {
    if (props.conversionGoal !== 'pro') return ''

    if (plan.key === 'supporter') return 'lg:order-1'
    if (plan.key === 'pro') return 'lg:order-2'
    return 'lg:order-3'
  }

  function getButtonStyle(plan: PricingPlan): {
    color: 'primary' | 'neutral'
    variant: 'solid' | 'outline' | 'soft'
  } {
    if (isCurrentPlan(plan)) {
      return { color: 'neutral', variant: 'soft' }
    }

    if (isPrimaryPlan(plan)) {
      return { color: 'primary', variant: 'solid' }
    }

    return plan.key === 'free'
      ? { color: 'neutral', variant: 'soft' }
      : { color: 'neutral', variant: 'outline' }
  }

  function getEffectiveMonthly(plan: PricingPlan): number {
    if (!plan.annualPrice) return plan.monthlyPrice
    return plan.annualPrice / 12
  }

  function getButtonLabel(plan: PricingPlan): string {
    if (isCurrentPlan(plan)) {
      return 'Current Plan'
    }

    if (status.value !== 'authenticated') {
      if (plan.key === 'free') return 'Sign Up'
      return plan.key === 'pro' ? 'Get Pro' : 'Get Supporter'
    }

    const currentTier = userStore.user?.subscriptionTier || 'FREE'
    const tiers = ['FREE', 'SUPPORTER', 'PRO']
    const currentLevel = tiers.indexOf(currentTier)
    const planLevel = tiers.indexOf(plan.key.toUpperCase())

    if (plan.key === 'pro') {
      return planLevel > currentLevel ? 'Upgrade to Pro' : 'Switch to Pro'
    }

    if (plan.key === 'supporter') {
      return planLevel >= currentLevel ? 'Choose Supporter' : 'Switch to Supporter'
    }

    return planLevel < currentLevel ? 'Downgrade to Free' : 'Stay Free'
  }

  async function handlePlanSelect(plan: PricingPlan) {
    if (userStore.user?.stripeCustomerId && userStore.user?.subscriptionTier !== 'FREE') {
      loading.value = true
      selectedPlan.value = plan.key
      await openCustomerPortal(window.location.href)
      loading.value = false
      selectedPlan.value = null
      return
    }

    if (plan.key === 'free') {
      if (status.value === 'authenticated') {
        navigateTo('/dashboard')
      } else {
        navigateTo('/login')
      }
      return
    }

    if (status.value !== 'authenticated') {
      navigateTo(`/login?plan=${plan.key}&interval=${billingInterval.value}`)
      return
    }

    const priceId = getStripePriceId(plan, billingInterval.value, currency.value)
    if (!priceId) {
      console.error('No Stripe price ID found for plan:', plan.key, billingInterval.value)
      return
    }

    loading.value = true
    selectedPlan.value = plan.key

    await createCheckoutSession(priceId, {
      successUrl: `${window.location.origin}/settings/billing?success=true`,
      cancelUrl: `${window.location.origin}${props.isBillingPage ? '/settings/billing' : '/pricing'}?canceled=true`
    })

    setTimeout(() => {
      loading.value = false
      selectedPlan.value = null
    }, 3000)
  }
</script>
