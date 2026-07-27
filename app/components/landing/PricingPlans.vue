<template>
  <div class="space-y-12">
    <div class="flex flex-wrap items-center justify-start gap-4">
      <div
        class="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1.5"
      >
        <button
          class="rounded-lg px-5 py-2 text-xs font-bold uppercase tracking-widest transition-colors"
          :class="
            billingInterval === 'monthly'
              ? 'bg-primary-500 text-black'
              : 'text-gray-400 hover:text-white'
          "
          @click="
            () => {
              billingInterval = 'monthly'
            }
          "
        >
          {{ t('billing.monthly') }}
        </button>
        <button
          class="flex items-center gap-2 rounded-lg px-5 py-2 text-xs font-bold uppercase tracking-widest transition-colors"
          :class="
            billingInterval === 'annual'
              ? 'bg-primary-500 text-black'
              : 'text-gray-400 hover:text-white'
          "
          @click="
            () => {
              billingInterval = 'annual'
            }
          "
        >
          {{ t('billing.annual') }}
          <span
            v-if="billingInterval !== 'annual' && toggleSavings"
            class="text-xs bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-full border border-primary-500/20"
          >
            {{ t('billing.save_pct', { pct: toggleSavings }) }}
          </span>
        </button>
      </div>

      <div
        class="inline-flex items-center gap-1 bg-white/5 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md"
      >
        <button
          class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
          :class="
            currency === 'usd'
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-300'
          "
          @click="
            () => {
              void setCurrency('usd')
            }
          "
        >
          USD
        </button>
        <button
          class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
          :class="
            currency === 'eur'
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-300'
          "
          @click="
            () => {
              void setCurrency('eur')
            }
          "
        >
          EUR
        </button>
      </div>
    </div>

    <div
      class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-7xl mx-auto"
      :class="props.conversionGoal === 'pro' ? 'lg:[grid-template-columns:1fr_1.1fr_1fr]' : ''"
    >
      <div
        v-for="plan in displayedPlans"
        :key="plan.key"
        class="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[oklch(16%_0.02_155)] p-8 sm:p-10 transition-[border-color] duration-200 hover:border-white/20"
        :class="[getCardClass(plan), getPlanOrderClass(plan)]"
      >
        <div
          v-if="isPrimaryPlan(plan)"
          class="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-primary-500/40"
        />

        <div
          v-if="getPlanBadge(plan)"
          class="absolute top-6 right-8 text-primary-500 text-xs font-black px-3 py-1 rounded-full border border-primary-500/20 bg-primary-500/5 uppercase tracking-widest"
        >
          {{ getPlanBadge(plan) }}
        </div>

        <div class="mb-10">
          <h3
            class="text-xs font-black uppercase tracking-[0.15em] text-gray-500 mb-6 group-hover:text-primary-500 transition-colors"
          >
            {{ t(`plan.${plan.key}.name`) }}
          </h3>

          <div class="flex items-baseline gap-2 mb-2 font-athletic">
            <span class="text-6xl font-black text-white leading-none">
              {{ formatPrice(priceFor(plan, billingInterval, currency), currency) }}
            </span>
            <span
              class="text-xs font-black text-gray-600 uppercase tracking-widest leading-none mb-1"
            >
              {{
                plan.key === 'free'
                  ? ''
                  : billingInterval === 'annual'
                    ? t('billing.per_year')
                    : t('billing.per_month')
              }}
            </span>
          </div>

          <div class="min-h-[2.5rem]">
            <template v-if="billingInterval === 'annual' && plan.annualPrice">
              <div class="text-xs font-black text-primary-500 uppercase tracking-widest mb-1">
                {{ formatPrice(monthlyEquivalent(plan, currency), currency) }} /
                {{ t('billing.per_month') }}
              </div>
              <div class="flex items-center gap-3">
                <span class="text-xs font-bold text-gray-600 line-through tracking-wider">
                  {{ formatPrice(priceFor(plan, 'monthly', currency), currency) }}/mo
                </span>
                <span
                  v-if="annualSavings(plan, currency)"
                  class="text-xs font-black text-emerald-500 uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/5 border border-emerald-500/20"
                >
                  {{ t('billing.save_pct', { pct: annualSavings(plan, currency) }) }}
                </span>
              </div>
            </template>
            <template v-else-if="plan.key !== 'free'">
              <div class="text-xs font-black text-gray-600 uppercase tracking-widest">
                {{ t('billing.billed_monthly') }}
              </div>
            </template>
          </div>
        </div>

        <p class="text-lg text-gray-400 font-medium leading-relaxed mb-10 min-h-[4rem]">
          {{ t(`plan.${plan.key}.description`) }}
        </p>

        <ul class="space-y-4 mb-10 flex-grow">
          <li
            v-for="(feature, fIndex) in plan.features"
            :key="fIndex"
            class="flex items-start gap-3 text-sm font-medium text-gray-300"
          >
            <UIcon
              name="i-heroicons-check-circle-solid"
              class="w-5 h-5 flex-shrink-0 mt-0.5 text-primary-500"
            />
            <span class="leading-tight">{{ t(`plan.${plan.key}.feature_${fIndex + 1}`) }}</span>
          </li>
        </ul>

        <div class="mt-auto space-y-4 pt-8 border-t border-white/5">
          <UButton
            size="xl"
            block
            class="h-14 rounded-xl text-[12px] font-bold uppercase tracking-[0.15em] transition-colors"
            :color="isPrimaryPlan(plan) ? 'primary' : 'neutral'"
            :variant="isPrimaryPlan(plan) ? 'solid' : 'outline'"
            :disabled="isCurrentPlan(plan) || loading"
            @click.stop="handlePlanSelect(plan)"
          >
            {{ getButtonLabel(plan) }}
          </UButton>
          <p class="text-xs font-black text-center text-slate-500 uppercase tracking-widest">
            {{ t('cancel_anytime') }}
          </p>
        </div>
      </div>
    </div>

    <UModal v-model:open="showDowngradeModal">
      <template #content>
        <div
          class="floating-card-base grain-overlay rounded-[2.5rem] p-10 overflow-hidden relative"
        >
          <div class="absolute top-0 right-0 p-8 opacity-5">
            <UIcon name="i-heroicons-exclamation-triangle-solid" class="w-24 h-24" />
          </div>

          <div class="relative z-10">
            <h3 class="text-3xl font-black text-white font-athletic uppercase mb-6">
              {{ t('modal.title') }}
            </h3>
            <p class="text-lg text-gray-400 font-medium leading-relaxed mb-8">
              {{ t('modal.warning') }}
            </p>

            <div class="flex flex-col sm:flex-row gap-4">
              <UButton
                color="neutral"
                variant="outline"
                size="xl"
                class="flex-1 h-14 rounded-xl text-xs font-black uppercase tracking-widest"
                @click="
                  () => {
                    showDowngradeModal = false
                  }
                "
              >
                {{ t('modal.keep_plan') }}
              </UButton>
              <UButton
                color="primary"
                variant="solid"
                size="xl"
                class="flex-1 h-14 rounded-xl text-xs font-black uppercase tracking-widest"
                :loading="loading"
                @click="
                  () => {
                    planToChangeTo && executePlanChange(planToChangeTo)
                  }
                "
              >
                {{ t('modal.confirm_change') }}
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'
  import {
    PRICING_PLANS,
    formatPrice,
    getStripePriceId,
    type BillingInterval,
    type PricingPlan,
    type PricingTier
  } from '~/utils/pricing'

  const { t } = useTranslate('pricing')
  function translate(key: string): string {
    return (t.value as (key: string) => string)(key)
  }

  type ConversionGoal = Exclude<PricingTier, 'free'>

  const props = withDefaults(
    defineProps<{
      conversionGoal?: ConversionGoal
    }>(),
    {
      conversionGoal: 'supporter'
    }
  )

  const emit = defineEmits<{
    close: []
  }>()

  const { status } = useAuth()
  const userStore = useUserStore()
  const { createCheckoutSession, openCustomerPortal, changePlan } = useStripe()
  const { currency, setCurrency } = useCurrency()
  const { priceFor, monthlyEquivalent, annualSavings, bestAnnualSavings } = useLivePricing()

  // Best real saving across paid plans — the toggle used to promise a flat 33%
  // while the cards below it showed the actual (different) figures.
  const toggleSavings = computed(() => bestAnnualSavings(PRICING_PLANS, currency.value))

  const billingInterval = ref<BillingInterval>('monthly')
  const loading = ref(false)
  const selectedPlan = ref<string | null>(null)
  const showDowngradeModal = ref(false)
  const planToChangeTo = ref<PricingPlan | null>(null)

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

  function getPlanBadge(plan: PricingPlan): string | null {
    if (isPrimaryPlan(plan)) {
      return props.conversionGoal === 'pro'
        ? translate('badge.best_value')
        : translate('badge.most_popular')
    }
    return null
  }

  function getCardClass(plan: PricingPlan): string {
    if (isPrimaryPlan(plan)) {
      return 'z-10 border-primary-500/40'
    }
    if (plan.key === 'free') {
      return 'border-white/10'
    }
    return 'border-white/8 opacity-90 hover:opacity-100'
  }

  function getPlanOrderClass(plan: PricingPlan): string {
    if (props.conversionGoal !== 'pro') return ''
    if (plan.key === 'supporter') return 'lg:order-1'
    if (plan.key === 'pro') return 'lg:order-2'
    return 'lg:order-3'
  }

  function getButtonLabel(plan: PricingPlan): string {
    if (isCurrentPlan(plan)) return translate('btn.current_plan')
    if (status.value !== 'authenticated') {
      if (plan.key === 'free') return translate('btn.start_free')
      if (plan.key === 'supporter') return translate('btn.get_supporter')
      return translate('btn.get_pro')
    }

    const currentTier = (userStore.user?.subscriptionTier || 'FREE').toUpperCase()
    const tiers = ['FREE', 'SUPPORTER', 'PRO']
    const currentLevel = tiers.indexOf(currentTier)
    const planLevel = tiers.indexOf(plan.key.toUpperCase())

    if (planLevel > currentLevel) {
      return plan.key === 'pro' ? translate('btn.upgrade_pro') : translate('btn.choose_supporter')
    }
    if (planLevel < currentLevel) {
      return plan.key === 'free'
        ? translate('btn.downgrade_free')
        : translate('btn.switch_supporter')
    }
    return translate('btn.current_plan')
  }

  async function executePlanChange(plan: PricingPlan) {
    loading.value = true
    selectedPlan.value = plan.key

    const priceId = getStripePriceId(plan, billingInterval.value, currency.value)
    if (priceId) {
      const currentTier = (userStore.user?.subscriptionTier || 'FREE').toUpperCase()
      const tiers = ['FREE', 'SUPPORTER', 'PRO']
      const currentLevel = tiers.indexOf(currentTier)
      const planLevel = tiers.indexOf(plan.key.toUpperCase())
      const direction = planLevel > currentLevel ? 'upgrade' : 'downgrade'

      const success = await changePlan(priceId, direction)
      if (success) {
        showDowngradeModal.value = false
        emit('close')
        navigateTo('/settings/billing?success=true')
        return
      }
    }
    loading.value = false
    selectedPlan.value = null
    showDowngradeModal.value = false
  }

  async function handlePlanSelect(plan: PricingPlan) {
    if (userStore.user?.stripeCustomerId && userStore.user?.subscriptionTier !== 'FREE') {
      const currentTier = (userStore.user?.subscriptionTier || 'FREE').toUpperCase()
      const tiers = ['FREE', 'SUPPORTER', 'PRO']
      const currentLevel = tiers.indexOf(currentTier)
      const planLevel = tiers.indexOf(plan.key.toUpperCase())

      if (planLevel >= currentLevel) {
        await executePlanChange(plan)
        return
      }

      if (plan.key !== 'free') {
        planToChangeTo.value = plan
        showDowngradeModal.value = true
        return
      }

      loading.value = true
      selectedPlan.value = plan.key
      await openCustomerPortal(window.location.href)
      loading.value = false
      selectedPlan.value = null
      return
    }

    if (plan.key === 'free') {
      navigateTo(status.value === 'authenticated' ? '/dashboard' : '/join')
      return
    }

    if (status.value !== 'authenticated') {
      navigateTo(`/join?plan=${plan.key}&interval=${billingInterval.value}`)
      return
    }

    const priceId = getStripePriceId(plan, billingInterval.value, currency.value)
    if (!priceId) return

    loading.value = true
    selectedPlan.value = plan.key
    await createCheckoutSession(priceId, {
      successUrl: `${window.location.origin}/settings/billing?success=true`,
      cancelUrl: `${window.location.origin}/pricing?canceled=true`
    })
    loading.value = false
  }
</script>

<style scoped>
  @keyframes pulseBorder {
    0%,
    100% {
      opacity: 0.3;
      transform: scale(1);
    }
    50% {
      opacity: 0.6;
      transform: scale(1.01);
    }
  }

  .animate-pulse-border {
    animation: pulseBorder 3s ease-in-out infinite;
  }
</style>
