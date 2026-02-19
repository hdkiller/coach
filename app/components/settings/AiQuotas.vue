<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-shield-check" class="w-5 h-5 text-primary" />
          <h2 class="text-xl font-semibold">LLM Quotas</h2>
        </div>
        <UBadge :color="tierColor" variant="soft" class="font-bold">
          {{ data?.tier || 'FREE' }}
        </UBadge>
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
              {{ (quota.operation || 'Unknown').replace(/_/g, ' ') }}
            </span>
            <span class="text-xs text-muted">
              {{ quota.used }} / {{ quota.limit }} (per {{ quota.window }})
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
            <span>{{ quota.remaining }} remaining</span>
            <span v-if="quota.resetsAt">Resets {{ formatRelativeTime(quota.resetsAt) }}</span>
          </div>
        </div>

        <div v-if="data.quotas.length === 0" class="text-center py-4 text-sm text-muted">
          No active quotas found for your tier.
        </div>
      </div>

      <div v-else class="text-center py-4 text-sm text-red-500">
        Failed to load quota information.
      </div>
    </div>

    <template #footer>
      <div class="space-y-4">
        <div
          v-if="data?.tier === 'FREE'"
          class="p-3 rounded-lg bg-primary-50 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex-1">
              <p class="text-xs font-bold text-primary-700 dark:text-primary-400 mb-0.5">
                Running low on AI power?
              </p>
              <p class="text-[10px] text-primary-600 dark:text-primary-500 leading-tight">
                Upgrade your plan to get higher limits and advanced coaching features.
              </p>
            </div>
            <UButton
              to="/settings/billing"
              size="xs"
              color="primary"
              variant="solid"
              label="Increase Limits"
              icon="i-heroicons-arrow-trending-up"
            />
          </div>
        </div>

        <p class="text-[11px] text-muted leading-relaxed">
          Quotas are reset automatically based on the time window shown. If you reach your limit,
          you may need to wait for the reset or consider upgrading your plan.
        </p>
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
  import type { QuotaStatus } from '~/../types/quotas'

  const { formatRelativeTime } = useFormat()

  const { data, pending } = useFetch<{ tier: string; quotas: QuotaStatus[] }>(
    '/api/profile/quotas',
    {
      server: false,
      lazy: true
    }
  )

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

  function getProgressBarColor(used: number, limit: number) {
    const ratio = used / limit
    if (ratio >= 1) return 'bg-red-500'
    if (ratio >= 0.8) return 'bg-amber-500'
    if (ratio >= 0.5) return 'bg-blue-500'
    return 'bg-emerald-500'
  }
</script>
