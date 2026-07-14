<template>
  <div
    v-if="shouldShow"
    class="rounded-lg border px-3 py-2 text-xs"
    :class="
      isExhausted
        ? 'border-amber-300/70 bg-amber-50 text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-100'
        : 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300'
    "
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="font-medium">
        {{ usageLabel }}
        <span v-if="resetLabel" class="font-normal text-muted"> · {{ resetLabel }}</span>
      </p>
      <button
        v-if="isExhausted"
        type="button"
        class="font-semibold text-primary-600 hover:text-primary-500 dark:text-primary-400"
        @click="openUpgrade"
      >
        {{ t('meter_upgrade_link') }}
      </button>
    </div>
    <p v-if="nextTierLabel" class="mt-1 text-[11px] text-muted-foreground">
      {{ nextTierLabel }}
    </p>
  </div>
</template>

<script setup lang="ts">
  import { useNow } from '@vueuse/core'
  import { useTranslate } from '@tolgee/vue'
  import type { QuotaStatus } from '~/types/quotas'
  import { hasQuotaResetPassed } from '~~/shared/quota-paywall'

  const props = defineProps<{
    operation: string
  }>()

  const { t } = useTranslate('quotas')
  const { formatRelativeTime } = useFormat()
  const { quotaSummary, ensureQuotasLoaded, isQuotaExhausted, showQuotaPaywall } = useQuotaPaywall()
  const now = useNow({ interval: 30_000 })

  const quota = computed<QuotaStatus | null>(() => {
    const quotas = quotaSummary.value?.quotas
    if (!quotas) return null
    return quotas.find((entry) => entry.operation === props.operation) || null
  })

  const resetPassed = computed(() => hasQuotaResetPassed(quota.value?.resetsAt, now.value))

  const shouldShow = computed(() => {
    if (!quotaSummary.value?.showQuotaMeter || !quota.value || resetPassed.value) return false
    if (quota.value.limit <= 0) return false
    const comfortablyHighThreshold = Math.max(1, Math.ceil(quota.value.limit * 0.5))
    return quota.value.remaining <= comfortablyHighThreshold
  })

  const isExhausted = computed(() => {
    return isQuotaExhausted(quota.value, now.value)
  })

  onMounted(() => {
    void ensureQuotasLoaded()
  })

  watch(resetPassed, (passed) => {
    if (passed) void ensureQuotasLoaded({ force: true })
  })

  const usageLabel = computed(() => {
    if (!quota.value) return ''
    const params = { used: quota.value.used, limit: quota.value.limit }
    return quota.value.window === 'calendar day'
      ? t.value('meter_used_calendar_day', params)
      : t.value('meter_used_window', params)
  })

  const resetLabel = computed(() => {
    if (!quota.value?.resetsAt) return ''
    if (quota.value.window === 'calendar day') {
      return t.value('meter_resets_midnight')
    }
    return t.value('meter_resets_at', { time: formatRelativeTime(quota.value.resetsAt) })
  })

  const nextTierLabel = computed(() => {
    if (!quota.value?.nextTierLimit || !quota.value.nextTier) return ''
    const windowLabel =
      quota.value.window === 'calendar day' ? 'day' : quota.value.window.replace('calendar ', '')
    const params = { limit: quota.value.nextTierLimit, window: windowLabel }
    return quota.value.nextTier === 'SUPPORTER'
      ? t.value('meter_next_tier_supporter', params)
      : t.value('meter_next_tier_pro', params)
  })

  async function openUpgrade() {
    await showQuotaPaywall({
      operation: props.operation as any,
      title: 'Usage Quota Reached',
      featureTitle: props.operation.replace(/_/g, ' '),
      reason: 'proactive_quota_meter',
      quota: quota.value
    })
  }
</script>
