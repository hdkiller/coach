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
        <!-- Maintenance Message when Subscriptions are Disabled -->
        <div v-if="!subscriptionsEnabled">
          <UAlert
            icon="i-heroicons-information-circle"
            color="info"
            variant="soft"
            title="Subscriptions Temporarily Unavailable"
            description="We are currently performing maintenance on our subscription system. New subscriptions and upgrades are temporarily disabled. Please check back later!"
          />
        </div>

        <!-- Feature-specific message -->
        <div
          v-if="featureTitle || featureDescription"
          class="bg-primary-50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/50 rounded-xl p-6"
        >
          <div class="flex items-start gap-4">
            <div class="p-2 bg-primary-100 dark:bg-primary-900/50 rounded-lg shrink-0">
              <UIcon
                name="i-heroicons-lock-closed"
                class="w-6 h-6 text-primary-600 dark:text-primary-400"
              />
            </div>
            <div>
              <h4 class="font-black text-gray-900 dark:text-white uppercase tracking-tight">
                {{ featureTitle }}
              </h4>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium leading-relaxed">
                {{ featureDescription }}
              </p>
            </div>
          </div>
        </div>

        <!-- Recommended plan (if specified) -->
        <div v-if="recommendedTier && subscriptionsEnabled">
          <div class="flex items-center gap-2 mb-4">
            <span class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400"
              >Recommended Solution</span
            >
            <div class="h-px bg-gray-100 dark:bg-gray-800 flex-1" />
          </div>
          <PricingPlanCard
            :plan="recommendedPlan!"
            :show-popular="false"
            :highlight="true"
            :currency="currency"
          />
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
  import { PRICING_PLANS, type PricingTier } from '~/utils/pricing'

  interface Props {
    title?: string
    featureTitle?: string
    featureDescription?: string
    recommendedTier?: PricingTier
  }

  const props = withDefaults(defineProps<Props>(), {
    title: 'Upgrade Your Plan',
    featureTitle: 'Premium Feature',
    featureDescription: 'This feature requires a paid subscription.'
  })

  const isOpen = defineModel<boolean>('open', { default: false })
  const userStore = useUserStore()
  const { currency } = useCurrency()
  const config = useRuntimeConfig()
  const subscriptionsEnabled = computed(() => config.public.subscriptionsEnabled)

  const recommendedPlan = computed(() => {
    if (!props.recommendedTier) return null
    return PRICING_PLANS.find((p) => p.key === props.recommendedTier)
  })

  function close() {
    isOpen.value = false
  }
</script>
