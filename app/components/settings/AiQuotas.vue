<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-chart-pie" class="w-5 h-5 text-primary" />
        <div>
          <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
            {{ t('quotas_header') }}
          </h3>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ t('quotas_desc') }}
          </p>
        </div>
      </div>
    </template>

    <div v-if="loading" class="space-y-6">
      <div v-for="i in 3" :key="i" class="space-y-2">
        <div class="flex justify-between">
          <USkeleton class="h-3 w-24" />
          <USkeleton class="h-3 w-12" />
        </div>
        <USkeleton class="h-2 w-full rounded-full" />
      </div>
    </div>

    <div v-else-if="quotas" class="space-y-6">
      <!-- Requests -->
      <div class="space-y-2">
        <div class="flex justify-between items-end">
          <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">{{
            t('quotas_label_requests')
          }}</span>
          <span class="text-sm font-black"
            >{{ quotas.requests.used }} / {{ quotas.requests.limit }}</span
          >
        </div>
        <UMeter :value="quotas.requests.used" :max="quotas.requests.limit" color="primary" />
      </div>

      <!-- Tokens -->
      <div class="space-y-2">
        <div class="flex justify-between items-end">
          <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">{{
            t('quotas_label_tokens')
          }}</span>
          <span class="text-sm font-black"
            >{{ formatTokens(quotas.tokens.used) }} / {{ formatTokens(quotas.tokens.limit) }}</span
          >
        </div>
        <UMeter :value="quotas.tokens.used" :max="quotas.tokens.limit" color="blue" />
      </div>

      <!-- Deep Analysis -->
      <div class="space-y-2">
        <div class="flex justify-between items-end">
          <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">{{
            t('quotas_label_analysis')
          }}</span>
          <span class="text-sm font-black"
            >{{ quotas.analysis.used }} / {{ quotas.analysis.limit }}</span
          >
        </div>
        <UMeter :value="quotas.analysis.used" :max="quotas.analysis.limit" color="purple" />
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('settings')
  const { data: quotas, pending: loading } = await useFetch<any>('/api/settings/ai/quotas')

  function formatTokens(val: number) {
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M'
    if (val >= 1000) return (val / 1000).toFixed(0) + 'K'
    return val
  }
</script>
