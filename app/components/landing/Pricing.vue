<template>
  <div id="pricing" class="py-24 sm:py-32 bg-gray-50 dark:bg-gray-900">
    <div class="mx-auto max-w-7xl px-6 lg:px-8">
      <div class="mx-auto max-w-2xl sm:text-center mb-16">
        <h2
          class="text-base font-semibold leading-7 text-primary-600 dark:text-primary-400 font-mono"
        >
          {{ t('label') }}
        </h2>
        <p class="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {{ t('headline') }}
        </p>
        <p class="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
          {{ t('description') }}
        </p>
      </div>

      <div>
        <LandingPricingPlans />

        <div v-if="subscriptionsEnabled" class="mx-auto mt-16 max-w-2xl lg:text-center">
          <p class="text-sm text-gray-500">{{ t('guarantee') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('pricing')
  const config = useRuntimeConfig()
  const subscriptionsEnabled = computed(() => config.public.subscriptionsEnabled)
</script>
