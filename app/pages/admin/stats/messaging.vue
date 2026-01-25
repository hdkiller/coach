<script setup lang="ts">
  import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    BarElement,
    CategoryScale,
    LinearScale,
    LineElement,
    PointElement
  } from 'chart.js'
  import { Bar } from 'vue-chartjs'

  ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    BarElement,
    CategoryScale,
    LinearScale,
    LineElement,
    PointElement
  )

  definePageMeta({
    layout: 'admin',
    middleware: ['auth', 'admin']
  })

  const { data: stats, pending } = await useFetch('/api/admin/stats/messaging')

  useHead({
    title: 'Messaging Intelligence Stats'
  })

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  }

  const dailyVolumeChartData = computed(() => {
    if (!stats.value?.dailyVolume) return { labels: [], datasets: [] }
    return {
      labels: stats.value.dailyVolume.map((d) =>
        new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      ),
      datasets: [
        {
          label: 'Messages',
          backgroundColor: '#3b82f6',
          data: stats.value.dailyVolume.map((d) => d.count),
          borderRadius: 4
        }
      ]
    }
  })
</script>

<template>
  <div class="flex-1 overflow-y-auto">
    <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-4">
      <UButton to="/admin/stats" icon="i-lucide-arrow-left" color="neutral" variant="ghost" />
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">
        Messaging Integration Stats
      </h1>
    </div>

    <div class="p-6 space-y-6">
      <div v-if="pending" class="flex items-center justify-center p-12">
        <UIcon name="i-lucide-loader-2" class="animate-spin h-8 w-8 text-gray-400" />
      </div>

      <template v-else>
        <!-- KPI Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <UCard class="bg-blue-50/50 dark:bg-blue-900/10">
            <div class="text-center">
              <div class="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">
                Connected Users
              </div>
              <div class="text-2xl font-bold font-mono">
                {{ stats?.telegram.users.toLocaleString() }}
              </div>
              <div class="text-xs text-gray-500 mt-1">Telegram</div>
            </div>
          </UCard>
          <UCard class="bg-indigo-50/50 dark:bg-indigo-900/10">
            <div class="text-center">
              <div class="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">
                Total Messages
              </div>
              <div class="text-2xl font-bold font-mono">
                {{ stats?.telegram.totalMessages.toLocaleString() }}
              </div>
            </div>
          </UCard>
          <UCard class="bg-emerald-50/50 dark:bg-emerald-900/10">
            <div class="text-center">
              <div class="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-1">
                Active (24h)
              </div>
              <div class="text-2xl font-bold font-mono">
                {{ stats?.telegram.dailyActive.toLocaleString() }}
              </div>
              <div class="text-xs text-gray-500 mt-1">Messages processed</div>
            </div>
          </UCard>
        </div>

        <!-- Volume Chart -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">Message Volume (Last 7 Days)</h3>
          </template>
          <div class="h-64 relative">
            <Bar :data="dailyVolumeChartData" :options="barOptions" />
          </div>
        </UCard>

        <!-- Logs Table -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">Recent Webhook Logs</h3>
          </template>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              <thead>
                <tr
                  class="text-left text-xs uppercase text-gray-500 bg-gray-50 dark:bg-gray-900/50"
                >
                  <th class="py-3 px-4">Time</th>
                  <th class="py-3 px-4">Provider</th>
                  <th class="py-3 px-4">Event</th>
                  <th class="py-3 px-4 text-center">Status</th>
                  <th class="py-3 px-4">Error</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                <tr
                  v-for="log in stats?.logs"
                  :key="log.id"
                  class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td class="py-2 px-4 whitespace-nowrap text-gray-500">
                    {{ new Date(log.createdAt).toLocaleString() }}
                  </td>
                  <td class="py-2 px-4 capitalize">
                    {{ log.provider }}
                  </td>
                  <td class="py-2 px-4">
                    <UBadge color="neutral" variant="soft" size="xs">
                      {{ log.eventType }}
                    </UBadge>
                  </td>
                  <td class="py-2 px-4 text-center">
                    <UBadge
                      :color="log.status === 'PROCESSED' ? 'success' : 'error'"
                      variant="subtle"
                      size="xs"
                    >
                      {{ log.status }}
                    </UBadge>
                  </td>
                  <td class="py-2 px-4 text-xs text-red-500 font-mono">
                    {{ log.error }}
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
