<template>
  <div class="bg-white dark:bg-gray-950 py-24 sm:py-32">
    <div class="mx-auto max-w-7xl px-6 lg:px-8">
      <div class="mx-auto max-w-2xl text-center">
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

      <div
        class="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-4"
      >
        <!-- Event Goal -->
        <div
          class="relative overflow-hidden rounded-2xl bg-gray-50 dark:bg-gray-900 p-8 transition-all hover:-translate-y-1 hover:shadow-lg border border-gray-200 dark:border-gray-800"
        >
          <div class="flex items-center gap-x-3">
            <div
              class="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
            >
              <UIcon name="i-heroicons-calendar" class="w-6 h-6" />
            </div>
            <h3 class="font-semibold text-gray-900 dark:text-white">{{ t('event_title') }}</h3>
          </div>
          <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
            "Gran Fondo New York" <br />
            <span class="text-xs text-gray-500">{{ t('event_sub') }}</span>
          </p>
          <div class="mt-4 flex gap-2">
            <UBadge color="neutral" variant="subtle" size="xs">{{ t('event_badge') }}</UBadge>
            <UBadge color="primary" variant="subtle" size="xs">{{ t('event_priority') }}</UBadge>
          </div>
        </div>

        <!-- Performance Goal -->
        <div
          class="relative overflow-hidden rounded-2xl bg-gray-50 dark:bg-gray-900 p-8 transition-all hover:-translate-y-1 hover:shadow-lg border border-gray-200 dark:border-gray-800"
        >
          <div class="flex items-center gap-x-3">
            <div
              class="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
            >
              <UIcon name="i-heroicons-bolt" class="w-6 h-6" />
            </div>
            <h3 class="font-semibold text-gray-900 dark:text-white">{{ t('perf_title') }}</h3>
          </div>
          <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
            "Increase FTP to 300W" <br />
            <span class="text-xs text-gray-500">{{ t('perf_sub') }}</span>
          </p>
          <div class="mt-4 flex gap-2">
            <UBadge color="neutral" variant="subtle" size="xs">{{ t('perf_badge') }}</UBadge>
            <div class="w-16 h-4 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mt-0.5">
              <div class="h-full bg-amber-500 w-3/4" />
            </div>
          </div>
        </div>

        <!-- Body Comp Goal -->
        <div
          class="relative overflow-hidden rounded-2xl bg-gray-50 dark:bg-gray-900 p-8 transition-all hover:-translate-y-1 hover:shadow-lg border border-gray-200 dark:border-gray-800"
        >
          <div class="flex items-center gap-x-3">
            <div
              class="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
            >
              <UIcon name="i-heroicons-scale" class="w-6 h-6" />
            </div>
            <h3 class="font-semibold text-gray-900 dark:text-white">{{ t('weight_title') }}</h3>
          </div>
          <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
            "Reach 70kg Race Weight" <br />
            <span class="text-xs text-gray-500">{{ t('weight_sub') }}</span>
          </p>
          <div class="mt-4 flex gap-2">
            <UBadge color="neutral" variant="subtle" size="xs">{{ t('weight_badge') }}</UBadge>
          </div>
        </div>

        <!-- Consistency Goal -->
        <div
          class="relative overflow-hidden rounded-2xl bg-gray-50 dark:bg-gray-900 p-8 transition-all hover:-translate-y-1 hover:shadow-lg border border-gray-200 dark:border-gray-800"
        >
          <div class="flex items-center gap-x-3">
            <div
              class="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
            >
              <UIcon name="i-heroicons-arrow-path" class="w-6 h-6" />
            </div>
            <h3 class="font-semibold text-gray-900 dark:text-white">
              {{ t('consistency_title') }}
            </h3>
          </div>
          <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
            "Ride 5 days/week" <br />
            <span class="text-xs text-gray-500">{{ t('consistency_sub') }}</span>
          </p>
          <div class="mt-4 flex gap-1">
            <div class="w-3 h-3 rounded-full bg-green-500" />
            <div class="w-3 h-3 rounded-full bg-green-500" />
            <div class="w-3 h-3 rounded-full bg-green-500" />
            <div class="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-700" />
            <div class="w-3 h-3 rounded-full bg-green-500" />
          </div>
        </div>
      </div>

      <div class="mt-12 flex justify-center">
        <UButton to="/login" size="lg" icon="i-heroicons-arrow-right" trailing>{{
          t('cta')
        }}</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'
  const { t } = useTranslate('goals')
</script>
