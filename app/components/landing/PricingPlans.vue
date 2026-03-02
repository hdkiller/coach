<template>
  <div class="space-y-12">
    <div class="flex flex-wrap justify-center items-center gap-6">
      <div class="inline-flex items-center gap-1 bg-white/5 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md">
        <button
          class="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          :class="
            billingInterval === 'monthly'
              ? 'bg-primary-500 text-black shadow-lg shadow-primary-500/20'
              : 'text-gray-400 hover:text-white'
          "
          @click="billingInterval = 'monthly'"
        >
          {{ t('billing.monthly') }}
        </button>
        <button
          class="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
          :class="
            billingInterval === 'annual'
              ? 'bg-primary-500 text-black shadow-lg shadow-primary-500/20'
              : 'text-gray-400 hover:text-white'
          "
          @click="billingInterval = 'annual'"
        >
          {{ t('billing.annual') }}
          <span
            v-if="billingInterval !== 'annual'"
            class="text-[9px] bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-full border border-primary-500/20"
          >
            {{ t('billing.save_pct', { pct: 33 }) }}
          </span>
        </button>
      </div>

      <div class="inline-flex items-center gap-1 bg-white/5 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md">
        <button
          class="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          :class="
            currency === 'usd'
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-300'
          "
          @click="setCurrency('usd')"
        >
          USD
        </button>
        <button
          class="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          :class="
            currency === 'eur'
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-300'
          "
          @click="setCurrency('eur')"
        >
          EUR
        </button>
      </div>
    </div>

    <div
      class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-7xl mx-auto"
      :class="
        props.conversionGoal === 'pro'
          ? 'lg:[grid-template-columns:1fr_1.1fr_1fr]'
          : ''
      "
    >
      <div
        v-for="plan in displayedPlans"
        :key="plan.key"
        class="flex flex-col relative overflow-hidden rounded-[2.5rem] floating-card-base grain-overlay p-8 sm:p-10 transition-all duration-500 group border-white/10"
        :class="[
          getCardClass(plan),
          getPlanOrderClass(plan),
          isPrimaryPlan(plan) ? 'shadow-2xl shadow-primary-500/10' : ''
        ]"
      >
        <!-- Custom Pulsing Border Overlay for Primary Plan -->
        <div v-if="isPrimaryPlan(plan)" class="absolute inset-0 rounded-[2.5rem] pointer-events-none ring-2 ring-primary-500/50 animate-pulse-border" />

        <div
          v-if="getPlanBadge(plan)"
          class="absolute top-6 right-8 text-primary-500 text-[9px] font-black px-3 py-1 rounded-full border border-primary-500/20 bg-primary-500/5 uppercase tracking-widest"
        >
          {{ getPlanBadge(plan) }}
        </div>

        <div class="mb-10">
          <h3 class="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-6 group-hover:text-primary-500 transition-colors">
            {{ t(`plan.${plan.key}.name`) }}
          </h3>

          <div class="flex items-baseline gap-2 mb-2 font-athletic italic">
            <span class="text-6xl font-black text-white leading-none">
              {{
                formatPrice(
                  billingInterval === 'annual' && plan.annualPrice
                    ? plan.annualPrice
                    : plan.monthlyPrice,
                  currency
                )
              }}
            </span>
            <span class="text-[10px] font-black text-gray-600 uppercase tracking-widest leading-none mb-1">
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
              <div class="text-[10px] font-black text-primary-500 uppercase tracking-widest mb-1">
                {{ formatPrice(getEffectiveMonthly(plan), currency) }} / {{ t('billing.per_month') }}
              </div>
              <div class="flex items-center gap-3">
                <span class="text-[10px] font-bold text-gray-600 line-through tracking-wider">
                  {{ formatPrice(plan.monthlyPrice, currency) }}/mo
                </span>
                <span class="text-[9px] font-black text-emerald-500 uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/5 border border-emerald-500/20">
                  {{ t('billing.save_pct', { pct: calculateAnnualSavings(plan) }) }}
                </span>
              </div>
            </template>
            <template v-else-if="plan.key !== 'free'">
              <div class="text-[10px] font-black text-gray-600 uppercase tracking-widest">
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
              class="w-5 h-5 flex-shrink-0 mt-0.5"
              :class="isPrimaryPlan(plan) ? 'text-primary-500' : 'text-gray-600'"
            />
            <span class="leading-tight">{{ t(`plan.${plan.key}.feature_${fIndex + 1}`) }}</span>
          </li>
        </ul>

        <div class="mt-auto space-y-4 pt-8 border-t border-white/5">
          <UButton
            size="xl"
            block
            class="h-16 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] transition-all"
            :color="isPrimaryPlan(plan) ? 'primary' : 'neutral'"
            :variant="isPrimaryPlan(plan) ? 'solid' : 'outline'"
            :disabled="isCurrentPlan(plan) || loading"
            @click.stop="handlePlanSelect(plan)"
          >
            {{ getButtonLabel(plan) }}
          </UButton>
          <p class="text-[9px] font-black text-center text-slate-500 uppercase tracking-widest">
            {{ t('cancel_anytime') }}
          </p>
        </div>
      </div>
    </div>

    <!-- Downgrade Confirmation Modal -->
    <UModal
      v-model:open="showDowngradeModal"
    >
      <template #content>
        <div class="floating-card-base grain-overlay rounded-[2.5rem] p-10 overflow-hidden relative">
          <div class="absolute top-0 right-0 p-8 opacity-5">
             <UIcon name="i-heroicons-exclamation-triangle-solid" class="w-24 h-24" />
          </div>
          
          <div class="relative z-10">
            <h3 class="text-3xl font-black text-white font-athletic italic uppercase mb-6">
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
                class="flex-1 h-14 rounded-xl text-[11px] font-black uppercase tracking-widest"
                @click="showDowngradeModal = false"
              >
                {{ t('modal.keep_plan') }}
              </UButton>
              <UButton
                color="primary"
                variant="solid"
                size="xl"
                class="flex-1 h-14 rounded-xl text-[11px] font-black uppercase tracking-widest"
                :loading="loading"
                @click="planToChangeTo && executePlanChange(planToChangeTo)"
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
    calculateAnnualSavings,
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
      isBillingPage?: boolean
    }>(),
    {
      conversionGoal: 'supporter',
      isBillingPage: false
    }
  )

  const emit = defineEmits<{
    close: []
  }>()

  const { status } = useAuth()
  const userStore = useUserStore()
  const { createCheckoutSession, openCustomerPortal, changePlan } = useStripe()
  const { currency, setCurrency } = useCurrency()
  const config = useRuntimeConfig()

  const billingInterval = ref<BillingInterval>('monthly')
  const loading = ref(false)
  const selectedPlan = ref<string | null>(null)
  const subscriptionsEnabled = computed(() => config.public.subscriptionsEnabled)

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
      return 'border-primary-500/50 lg:scale-[1.03] z-10'
    }
    return 'border-white/5 opacity-80 hover:opacity-100 hover:scale-[1.01]'
  }

  function getPlanOrderClass(plan: PricingPlan): string {
    if (props.conversionGoal !== 'pro') return ''
    if (plan.key === 'supporter') return 'lg:order-1'
    if (plan.key === 'pro') return 'lg:order-2'
    return 'lg:order-3'
  }

  function getEffectiveMonthly(plan: PricingPlan): number {
    if (!plan.annualPrice) return plan.monthlyPrice
    return plan.annualPrice / 12
  }

  function getButtonLabel(plan: PricingPlan): string {
    if (isCurrentPlan(plan)) return translate('btn.current_plan')
    if (status.value !== 'authenticated') return translate('btn.sign_up')
    
    const currentTier = userStore.user?.subscriptionTier || 'FREE'
    const tiers = ['FREE', 'SUPPORTER', 'PRO']
    const currentLevel = tiers.indexOf(currentTier)
    const planLevel = tiers.indexOf(plan.key.toUpperCase())

    if (planLevel > currentLevel) return translate('btn.upgrade_pro')
    return translate('btn.switch_pro')
  }

  async function executePlanChange(plan: PricingPlan) {
    loading.value = true
    selectedPlan.value = plan.key

    const priceId = getStripePriceId(plan, billingInterval.value, currency.value)
    if (priceId) {
      const currentTier = userStore.user?.subscriptionTier || 'FREE'
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
      const currentTier = userStore.user?.subscriptionTier || 'FREE'
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
      navigateTo(status.value === 'authenticated' ? '/dashboard' : '/login')
      return
    }

    if (status.value !== 'authenticated') {
      navigateTo(`/login?plan=${plan.key}&interval=${billingInterval.value}`)
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
    0%, 100% {
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
