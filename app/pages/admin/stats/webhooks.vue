<script setup lang="ts">
  import WebhookVolumeComparisonChart from '~/components/admin/WebhookVolumeComparisonChart.vue'

  const { tr } = useAdminStatsI18n()

  definePageMeta({
    layout: 'admin',
    middleware: ['auth', 'admin']
  })

  const { data: stats, pending } = await useFetch('/api/admin/stats/webhooks')

  useHead({
    title: () => tr('webhooks_meta_title', 'Webhook Statistics')
  })

  const maxDailyEvents = computed(() => {
    if (!stats.value?.eventsByDay) return 1
    return Math.max(...stats.value.eventsByDay.map((d: any) => d.count)) || 1
  })

  const totalStatusEvents = computed(() => {
    if (!stats.value?.statusCounts?.length) return 1
    return stats.value.statusCounts.reduce((sum: number, item: any) => sum + item.count, 0) || 1
  })
</script>

<template>
  <div class="flex-1 overflow-y-auto">
    <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-4">
      <UButton to="/admin/stats" icon="i-lucide-arrow-left" color="neutral" variant="ghost" />
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">
        {{ tr('webhooks_page_title', 'Webhook Stats') }}
      </h1>
    </div>

    <div class="p-6 space-y-6">
      <div v-if="pending" class="flex items-center justify-center p-12">
        <UIcon name="i-lucide-loader-2" class="animate-spin h-8 w-8 text-gray-400" />
      </div>

      <template v-else>
        <!-- Hourly Volume Comparison -->
        <UCard>
          <template #header>
            <div class="flex justify-between items-center">
              <h2 class="text-lg font-bold uppercase tracking-tight">
                {{ tr('webhooks_hourly_volume', 'Hourly Volume Comparison') }}
              </h2>
              <span class="text-xs text-gray-500">
                {{ tr('webhooks_hourly_subtitle', 'Today vs 3-Day Average') }}
              </span>
            </div>
          </template>
          <WebhookVolumeComparisonChart
            v-if="stats?.hourlyComparison"
            :data="stats.hourlyComparison"
          />
        </UCard>

        <!-- Daily Volume Chart -->
        <UCard>
          <template #header>
            <div class="flex justify-between items-center">
              <h2 class="text-lg font-bold uppercase tracking-tight">
                {{ tr('webhooks_daily_volume', 'Daily Event Volume') }}
              </h2>
              <span class="text-xs text-gray-500">
                {{ tr('webhooks_daily_subtitle', 'Last 30 Days') }}
              </span>
            </div>
          </template>
          <div class="h-64">
            <div v-if="stats" class="flex items-end justify-between h-full pt-4 gap-1">
              <div
                v-for="day in stats.eventsByDay"
                :key="day.date"
                class="group relative flex-1 bg-amber-500 rounded-t transition-all hover:bg-amber-600"
                :style="{
                  height: `${(day.count / maxDailyEvents) * 100}%`
                }"
              >
                <div
                  class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10"
                >
                  {{
                    tr('webhooks_daily_tooltip', '{date}: {count} events', {
                      date: day.date ?? '',
                      count: day.count ?? 0
                    })
                  }}
                </div>
              </div>
            </div>
            <div v-else class="h-full flex items-center justify-center text-gray-400">
              {{ tr('webhooks_no_data', 'No data available') }}
            </div>
          </div>
        </UCard>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Breakdown by Provider -->
          <UCard>
            <template #header>
              <h3 class="font-semibold">{{ tr('webhooks_by_provider', 'Events by Provider') }}</h3>
            </template>
            <div class="space-y-4">
              <div
                v-for="item in stats?.providerCounts"
                :key="item.provider"
                class="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-800 rounded-lg"
              >
                <span class="font-medium capitalize">{{ item.provider }}</span>
                <UBadge color="neutral" variant="solid">
                  {{ tr('webhooks_provider_events', '{count} events', { count: item.count }) }}
                </UBadge>
              </div>
            </div>
          </UCard>

          <!-- Status Breakdown -->
          <UCard>
            <template #header>
              <h3 class="font-semibold">
                {{ tr('webhooks_processing_status', 'Processing Status') }}
              </h3>
            </template>
            <div class="space-y-4">
              <div v-for="item in stats?.statusCounts" :key="item.status" class="space-y-1">
                <div class="flex justify-between text-sm">
                  <span class="font-bold">{{ item.status }}</span>
                  <span class="text-gray-500">{{ item.count }}</span>
                </div>
                <UProgress
                  :model-value="item.count"
                  :max="totalStatusEvents"
                  :color="
                    item.status === 'PROCESSED'
                      ? 'success'
                      : item.status === 'FAILED'
                        ? 'error'
                        : 'primary'
                  "
                />
              </div>
            </div>
          </UCard>
        </div>

        <!-- Recent Failures -->
        <UCard>
          <template #header>
            <h3 class="font-semibold text-red-500">
              {{ tr('webhooks_recent_failures', 'Recent Failures') }}
            </h3>
          </template>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr class="text-left text-xs uppercase text-gray-500">
                  <th class="py-2 pl-4">{{ tr('webhooks_col_time', 'Time') }}</th>
                  <th class="py-2">{{ tr('webhooks_col_provider', 'Provider') }}</th>
                  <th class="py-2">{{ tr('webhooks_col_event', 'Event') }}</th>
                  <th class="py-2">{{ tr('webhooks_col_error', 'Error') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                <tr v-for="fail in stats?.recentFailures" :key="fail.id" class="text-sm">
                  <td class="py-3 pl-4 whitespace-nowrap text-gray-500">
                    {{ new Date(fail.createdAt).toLocaleString() }}
                  </td>
                  <td class="py-3 capitalize">{{ fail.provider }}</td>
                  <td class="py-3 font-mono text-xs">{{ fail.eventType }}</td>
                  <td
                    class="py-3 text-red-600 dark:text-red-400 max-w-xs truncate"
                    :title="fail.error || ''"
                  >
                    {{ fail.error }}
                  </td>
                </tr>
                <tr v-if="!stats?.recentFailures.length">
                  <td colspan="4" class="py-4 text-center text-gray-400">
                    {{ tr('webhooks_no_failures', 'No recent failures') }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </template>
    </div>
  </div>
</template>
