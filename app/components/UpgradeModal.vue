<template>
  <UModal
    v-model:open="isOpen"
    :title="title || 'Upgrade Your Plan'"
    :ui="{
      content: 'sm:max-w-xl z-[9999]',
      overlay: 'z-[9998]'
    }"
  >
    <template #body>
      <div class="space-y-6">
        <!-- Maintenance Message -->
        <div v-if="!subscriptionsEnabled">
          <UAlert
            icon="i-heroicons-information-circle"
            color="info"
            variant="soft"
            title="Subscriptions Temporarily Unavailable"
            description="We are currently performing maintenance on our subscription system. Please check back later!"
          />
        </div>

        <!-- Momentum Header -->
        <div
          v-if="featureTitle || featureDescription"
          class="bg-primary-50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/50 rounded-xl p-4 sm:p-6"
        >
          <div>
            <h4
              class="font-black text-gray-900 dark:text-white uppercase tracking-tight text-sm sm:text-base"
            >
              {{ featureTitle }}
            </h4>
            <p
              class="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium leading-relaxed"
            >
              {{ featureDescription }}
            </p>
          </div>

          <!-- Specific Value Labels -->
          <div v-if="bullets.length > 0" class="mt-4 sm:mt-6 hidden sm:flex flex-wrap gap-2">
            <div
              v-for="bullet in bullets"
              :key="bullet"
              class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary-100/50 dark:bg-primary-900/30 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-primary-700 dark:text-primary-300"
            >
              <UIcon name="i-heroicons-check" class="w-3 h-3 shrink-0" />
              {{ bullet }}
            </div>
          </div>
        </div>

        <!-- Recommended Plan -->
        <div v-if="recommendedTier && subscriptionsEnabled">
          <div class="flex items-center gap-2 mb-4">
            <span class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400"
              >Elite Performance Solution</span
            >
            <div class="h-px bg-gray-100 dark:bg-gray-800 flex-1" />
          </div>

          <!-- Selectors -->
          <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div class="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <button
                v-for="interval in ['monthly', 'annual'] as const"
                :key="interval"
                class="px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all"
                :class="
                  billingInterval === interval
                    ? 'bg-white dark:bg-gray-900 shadow-sm text-primary-600 dark:text-primary-400'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                "
                @click="billingInterval = interval"
              >
                {{ interval }}
                <span v-if="interval === 'annual'" class="ml-1 text-green-500">(-33%)</span>
              </button>
            </div>

            <div class="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <button
                v-for="curr in ['usd', 'eur'] as const"
                :key="curr"
                class="px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all"
                :class="
                  currency === curr
                    ? 'bg-white dark:bg-gray-900 shadow-sm text-primary-600 dark:text-primary-400'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                "
                @click="setCurrency(curr)"
              >
                {{ curr }}
              </button>
            </div>
          </div>

          <PricingPlanCard
            :plan="recommendedPlan!"
            :show-popular="false"
            :highlight="true"
            :currency="currency"
            :interval="billingInterval"
            @select="handlePlanSelect"
          />
          <p class="mt-3 text-center text-[10px] text-gray-500 font-bold uppercase tracking-widest">
            Unlock instant access. Cancel or downgrade anytime.
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between items-center w-full">
        <UButton variant="ghost" color="neutral" @click="close">
          {{ subscriptionsEnabled ? 'Maybe Later' : 'Close' }}
        </UButton>
        <UButton variant="link" color="primary" :to="'/settings/billing'" @click="close">
          View Full Pricing Details
          <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 ml-1" />
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  import {
    PRICING_PLANS,
    getStripePriceId,
    type PricingTier,
    type PricingPlan,
    type BillingInterval
  } from '~/utils/pricing'

  interface Props {
    title?: string
    featureTitle?: string
    featureDescription?: string
    recommendedTier?: PricingTier
    bullets?: string[]
  }

  const props = withDefaults(defineProps<Props>(), {
    title: 'Upgrade Your Plan',
    featureTitle: 'Elite Feature',
    featureDescription: 'This feature requires a premium subscription.',
    bullets: () => []
  })

  const isOpen = defineModel<boolean>('open', { default: false })
  const userStore = useUserStore()
  const { currency, setCurrency } = useCurrency()
  const { createCheckoutSession, openCustomerPortal } = useStripe()
  const config = useRuntimeConfig()
  const subscriptionsEnabled = computed(() => config.public.subscriptionsEnabled)

  const billingInterval = ref<BillingInterval>('monthly')

  const recommendedPlan = computed(() => {
    if (!props.recommendedTier) return null
    return PRICING_PLANS.find((p) => p.key === props.recommendedTier)
  })

  async function handlePlanSelect(plan: PricingPlan) {
    // If user already has a subscription, open portal to manage/change
    if (userStore.user?.stripeCustomerId && userStore.user?.subscriptionTier !== 'FREE') {
      await openCustomerPortal(window.location.href)
      return
    }

    const priceId = getStripePriceId(plan, billingInterval.value, currency.value)
    if (!priceId) {
      console.error('No Stripe price ID found for plan:', plan.key, billingInterval.value)
      return
    }

    await createCheckoutSession(priceId, {
      successUrl: `${window.location.origin}/settings/billing?success=true`,
      cancelUrl: window.location.href
    })
  }

  function close() {
    isOpen.value = false
  }
</script>
