<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-shield-check" class="w-5 h-5 text-primary" />
          <h2 class="text-xl font-semibold">{{ t('quotas_header') }}</h2>
        </div>
        <div class="flex items-center gap-2">
          <UBadge
            v-if="isTrialActive"
            color="primary"
            variant="solid"
            class="font-black uppercase tracking-widest text-[9px] animate-pulse"
          >
            {{ t('quotas_trial_active_badge') }}
          </UBadge>
          <UBadge :color="tierColor" variant="soft" class="font-bold">
            {{ tierLabel }}
          </UBadge>
        </div>
      </div>
    </template>

    <div class="space-y-6">
      <div v-if="pending" class="flex items-center justify-center py-8">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
      </div>

      <div v-else-if="data?.quotas" class="space-y-5">
        <div v-for="quota in sortedQuotas" :key="quota.operation" class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="font-medium text-gray-900 dark:text-white capitalize">
              {{ (quota.operation || t('quotas_unknown')).replace(/_/g, ' ') }}
            </span>
            <span class="text-xs text-muted">
              {{ quota.used }} / {{ quota.limit }} ({{
                quota.window === 'calendar day'
                  ? t('quotas_per_day')
                  : t('quotas_per_window', { window: quota.window })
              }})
            </span>
          </div>

          <div
            class="relative w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden"
          >
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="getProgressBarColor(quota.used, quota.limit)"
              :style="{ width: `${Math.min(100, (quota.used / quota.limit) * 100)}%` }"
            ></div>
          </div>

          <div
            class="flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-semibold"
          >
            <span>{{ t('quotas_remaining', { count: quota.remaining }) }}</span>
            <span v-if="quota.resetsAt">
              {{ getQuotaResetLabel(quota) }}
            </span>
          </div>
        </div>

        <div v-if="data.quotas.length === 0" class="text-center py-4 text-sm text-muted">
          {{ t('quotas_empty') }}
        </div>
      </div>

      <div v-else class="text-center py-4 text-sm text-red-500">
        {{ t('quotas_load_failed') }}
      </div>
    </div>

    <template #footer>
      <div class="space-y-4">
        <div
          v-if="isTrialActive"
          class="p-3 rounded-lg bg-primary-50 dark:bg-primary-950/30 border border-primary-500/50"
        >
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-bolt" class="w-5 h-5 text-primary-500" />
            <div class="flex-1">
              <p
                class="text-xs font-black uppercase tracking-tight text-primary-900 dark:text-primary-100"
              >
                {{ t('quotas_trial_active_title') }}
              </p>
              <p class="text-[10px] text-primary-700 dark:text-primary-400 leading-tight mt-0.5">
                {{ t('quotas_trial_active_desc', { date: trialEndsAtLabel }) }}
              </p>
            </div>
          </div>
        </div>

        <div
          v-if="data?.tier === 'FREE' && !isTrialActive"
          class="p-3 rounded-lg bg-primary-50 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex-1">
              <p class="text-xs font-bold text-primary-700 dark:text-primary-400 mb-0.5">
                {{ t('quotas_upgrade_title') }}
              </p>
              <p class="text-[10px] text-primary-600 dark:text-primary-500 leading-tight">
                {{ t('quotas_upgrade_desc') }}
              </p>
            </div>
            <UButton
              to="/settings/billing"
              size="xs"
              color="primary"
              variant="solid"
              :label="t('quotas_upgrade_button')"
              icon="i-heroicons-arrow-trending-up"
            />
          </div>
        </div>

        <p class="text-[11px] text-muted leading-relaxed">
          {{ t('quotas_footer_note') }}
        </p>
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'
  import type { QuotaStatus } from '~/types/quotas'

  const { t } = useTranslate('settings')

  const { formatRelativeTime, formatUserDate, timezone } = useFormat()

  const { data, pending } = (useFetch as any)('/api/profile/quotas', {
    server: false,
    lazy: true
  }) as any

  const isTrialActive = computed(() => {
    if (!data.value?.trialEndsAt) return false
    return new Date(data.value.trialEndsAt) > new Date()
  })

  const trialEndsAtLabel = computed(() => {
    if (!data.value?.trialEndsAt) return ''
    return formatUserDate(data.value.trialEndsAt, timezone.value)
  })

  const sortedQuotas = computed(() => {
    const quotas = data.value?.quotas
    if (!quotas) return []
    // Sort by usage percentage descending
    return [...quotas].sort((a, b) => {
      const bPct = b.used / b.limit
      const aPct = a.used / a.limit
      return bPct - aPct
    })
  })

  const tierColor = computed(() => {
    const tier = data.value?.tier || 'FREE'
    if (tier === 'PRO') return 'primary'
    if (tier === 'SUPPORTER') return 'info'
    return 'neutral'
  })

  const tierLabel = computed(() => {
    const tier = (data.value?.tier || 'FREE').toUpperCase()
    if (tier === 'PRO') return t.value('billing_tier_pro')
    if (tier === 'SUPPORTER') return t.value('billing_tier_supporter')
    return t.value('billing_tier_free')
  })

  function getProgressBarColor(used: number, limit: number) {
    const ratio = used / limit
    if (ratio >= 1) return 'bg-red-500'
    if (ratio >= 0.8) return 'bg-amber-500'
    if (ratio >= 0.5) return 'bg-blue-500'
    return 'bg-emerald-500'
  }

  function getQuotaResetLabel(quota: QuotaStatus) {
    if (!quota.resetsAt) return ''
    if (quota.window === 'calendar day') return t.value('quotas_resets_midnight')
    return t.value('quotas_resets_oldest', { time: formatRelativeTime(quota.resetsAt) })
  }
</script>
