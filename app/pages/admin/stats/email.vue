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
    PointElement,
    Filler
  } from 'chart.js'
  import { Pie, Bar, Line, Doughnut } from 'vue-chartjs'

  ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    BarElement,
    CategoryScale,
    LinearScale,
    LineElement,
    PointElement,
    Filler
  )

  definePageMeta({
    layout: 'admin',
    middleware: ['auth', 'admin']
  })

  useHead({
    title: 'Email Communication Stats'
  })

  const { data: stats, pending } = await useFetch('/api/admin/stats/email')

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          boxWidth: 12
        }
      }
    }
  }

  const stackedBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          padding: 15
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false
        }
      },
      y: {
        stacked: true,
        beginAtZero: true
      }
    }
  }

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
        beginAtZero: true
      }
    }
  }

  const statusColors: Record<string, string> = {
    QUEUED: '#94a3b8', // Slate 400
    SENDING: '#3b82f6', // Blue 500
    SENT: '#0ea5e9', // Sky 500
    DELIVERED: '#10b981', // Emerald 500
    OPENED: '#6366f1', // Indigo 500
    CLICKED: '#8b5cf6', // Purple 500
    BOUNCED: '#f59e0b', // Amber 500
    COMPLAINED: '#f97316', // Orange 500
    UNSUBSCRIBED: '#64748b', // Slate 500
    FAILED: '#ef4444', // Red 500
    SUPPRESSED: '#475569' // Slate 600
  }

  const deliverabilityTrendData = computed(() => {
    if (!stats.value?.dailyTrends) return { labels: [], datasets: [] }

    const trends = stats.value.dailyTrends
    const dates = [
      ...new Set(trends.map((t) => new Date(t.date as string).toISOString().split('T')[0]))
    ].sort()
    const statuses = [...new Set(trends.map((t) => t.status))]

    return {
      labels: dates.map((d) =>
        new Date(d as string).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      ),
      datasets: statuses.map((status) => ({
        label: status,
        backgroundColor: statusColors[status] || '#cbd5e1',
        data: dates.map((date) => {
          const match = trends.find(
            (t) =>
              t.date &&
              new Date(t.date as string).toISOString().split('T')[0] === date &&
              t.status === status
          )
          return match ? match.count : 0
        })
      }))
    }
  })

  const statusBreakdownData = computed(() => {
    if (!stats.value?.totals) return { labels: [], datasets: [] }

    const totals = stats.value.totals
    const labels = Object.keys(totals).filter((k) => k !== 'total')

    return {
      labels,
      datasets: [
        {
          data: labels.map((l) => (totals as any)[l] || 0) as number[],
          backgroundColor: labels.map((l) => statusColors[l] || '#cbd5e1')
        }
      ]
    }
  })

  const templateUsageData = computed(() => {
    if (!stats.value?.templateUsage) return { labels: [], datasets: [] }

    return {
      labels: stats.value.templateUsage.map((t) => t.template.replace(/_/g, ' ')),
      datasets: [
        {
          label: 'Volume',
          data: stats.value.templateUsage.map((t) => t.count),
          backgroundColor: '#3b82f6',
          borderRadius: 4
        }
      ]
    }
  })

  const templatePerformanceData = computed(() => {
    if (!stats.value?.templatePerformance) return { labels: [], datasets: [] }

    return {
      labels: stats.value.templatePerformance.map((t) => t.template.replace(/_/g, ' ')),
      datasets: [
        {
          label: 'Open Rate (%)',
          data: stats.value.templatePerformance.map((t) => t.openRate),
          backgroundColor: '#10b981',
          borderRadius: 4
        },
        {
          label: 'Click Rate (%)',
          data: stats.value.templatePerformance.map((t) => t.clickRate),
          backgroundColor: '#8b5cf6',
          borderRadius: 4
        }
      ]
    }
  })

  const audienceData = computed(() => {
    if (!stats.value?.audienceDistribution) return { labels: [], datasets: [] }

    return {
      labels: stats.value.audienceDistribution.map((a) => a.audience),
      datasets: [
        {
          data: stats.value.audienceDistribution.map((a) => a.count),
          backgroundColor: ['#3b82f6', '#10b981', '#f59e0b']
        }
      ]
    }
  })

  const suppressionData = computed(() => {
    if (!stats.value?.suppressions) return { labels: [], datasets: [] }

    return {
      labels: stats.value.suppressions.map((s) => s.reason),
      datasets: [
        {
          data: stats.value.suppressions.map((s) => s.count),
          backgroundColor: ['#ef4444', '#f97316', '#64748b', '#475569']
        }
      ]
    }
  })

  const deliveryRate = computed(() => {
    if (!stats.value?.totals) return 0
    const t = stats.value.totals
    const total = t.total || 0
    if (total === 0) return 0
    const delivered = (t.DELIVERED || 0) + (t.OPENED || 0) + (t.CLICKED || 0)
    return (delivered / total) * 100
  })

  const openRate = computed(() => {
    if (!stats.value?.totals) return 0
    const t = stats.value.totals
    const delivered = (t.DELIVERED || 0) + (t.OPENED || 0) + (t.CLICKED || 0)
    if (delivered === 0) return 0
    const opened = (t.OPENED || 0) + (t.CLICKED || 0)
    return (opened / delivered) * 100
  })

  const clickRate = computed(() => {
    if (!stats.value?.totals) return 0
    const t = stats.value.totals
    const opened = (t.OPENED || 0) + (t.CLICKED || 0)
    if (opened === 0) return 0
    return ((t.CLICKED || 0) / opened) * 100
  })
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Email Communication Stats">
        <template #leading>
          <UButton to="/admin/stats" icon="i-lucide-arrow-left" color="neutral" variant="ghost" />
        </template>
        <template #trailing>
          <UButton
            to="/admin/emails"
            label="Manage Emails"
            icon="i-lucide-mail"
            variant="ghost"
            color="neutral"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 space-y-6">
        <div v-if="pending" class="flex items-center justify-center p-12">
          <UIcon name="i-lucide-loader-2" class="animate-spin h-8 w-8 text-gray-400" />
        </div>

        <template v-else>
          <!-- Summary Cards -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <UCard class="bg-blue-50/50 dark:bg-blue-900/10">
              <div class="text-center">
                <div class="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">
                  Total Emails
                </div>
                <div class="text-2xl font-bold font-mono">
                  {{ stats?.totals?.total?.toLocaleString() ?? '0' }}
                </div>
              </div>
            </UCard>
            <UCard class="bg-emerald-50/50 dark:bg-emerald-900/10">
              <div class="text-center">
                <div class="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-1">
                  Delivery Rate
                </div>
                <div class="text-2xl font-bold font-mono">{{ deliveryRate.toFixed(1) }}%</div>
              </div>
            </UCard>
            <UCard class="bg-indigo-50/50 dark:bg-indigo-900/10">
              <div class="text-center">
                <div class="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">
                  Open Rate
                </div>
                <div class="text-2xl font-bold font-mono">{{ openRate.toFixed(1) }}%</div>
              </div>
            </UCard>
            <UCard class="bg-purple-50/50 dark:bg-purple-900/10">
              <div class="text-center">
                <div class="text-xs font-bold text-purple-500 uppercase tracking-widest mb-1">
                  Click Rate
                </div>
                <div class="text-2xl font-bold font-mono">{{ clickRate.toFixed(1) }}%</div>
              </div>
            </UCard>
          </div>

          <!-- Actionable Queue Stats -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <UCard
              class="hover:border-primary-500 transition-colors cursor-pointer"
              @click="navigateTo('/admin/emails')"
            >
              <div class="flex items-center gap-4">
                <div class="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                  <UIcon name="i-lucide-clock" class="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <div class="text-sm font-medium text-gray-500">Currently Queued</div>
                  <div class="text-2xl font-bold">{{ stats?.queueTotal || 0 }}</div>
                </div>
              </div>
            </UCard>

            <UCard
              class="hover:border-primary-500 transition-colors cursor-pointer"
              @click="navigateTo('/admin/emails')"
            >
              <div class="flex items-center gap-4">
                <div class="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <UIcon name="i-lucide-alert-triangle" class="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <div class="text-sm font-medium text-gray-500">Stale (>24h)</div>
                  <div class="text-2xl font-bold text-red-600">{{ stats?.staleQueue || 0 }}</div>
                </div>
              </div>
            </UCard>

            <UCard
              class="hover:border-primary-500 transition-colors cursor-pointer"
              @click="navigateTo('/admin/emails')"
            >
              <div class="flex items-center gap-4">
                <div class="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-full">
                  <UIcon name="i-lucide-x-circle" class="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <div class="text-sm font-medium text-gray-500">Recent Failures (24h)</div>
                  <div class="text-2xl font-bold text-rose-600">
                    {{ stats?.recentFailures || 0 }}
                  </div>
                </div>
              </div>
            </UCard>
          </div>

          <!-- Deliverability Trends -->
          <UCard>
            <template #header>
              <h3 class="font-semibold">Deliverability Trends (Last 30 Days)</h3>
            </template>
            <div class="h-80 relative">
              <Bar :data="deliverabilityTrendData" :options="stackedBarOptions" />
            </div>
          </UCard>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Status Breakdown -->
            <UCard>
              <template #header>
                <h3 class="font-semibold">Delivery Status Breakdown</h3>
              </template>
              <div class="h-64 relative">
                <Doughnut :data="statusBreakdownData" :options="pieOptions" />
              </div>
            </UCard>

            <!-- Audience Distribution -->
            <UCard>
              <template #header>
                <h3 class="font-semibold">Audience Distribution</h3>
              </template>
              <div class="h-64 relative">
                <Pie :data="audienceData" :options="pieOptions" />
              </div>
            </UCard>

            <!-- Suppression Reasons -->
            <UCard>
              <template #header>
                <h3 class="font-semibold">Active Suppressions</h3>
              </template>
              <div class="h-64 relative">
                <Bar :data="suppressionData" :options="barOptions" />
              </div>
            </UCard>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Top Templates by Volume -->
            <UCard>
              <template #header>
                <h3 class="font-semibold">Top Templates by Volume</h3>
              </template>
              <div class="h-80 relative">
                <Bar
                  :data="templateUsageData"
                  :options="{ ...barOptions, indexAxis: 'y' as const }"
                />
              </div>
            </UCard>

            <!-- Template Performance -->
            <UCard>
              <template #header>
                <h3 class="font-semibold">Template Performance (Open & Click Rates)</h3>
              </template>
              <div class="h-80 relative">
                <Bar
                  :data="templatePerformanceData"
                  :options="{
                    ...barOptions,
                    indexAxis: 'y' as const,
                    plugins: { legend: { display: true, position: 'bottom' as const } }
                  }"
                />
              </div>
            </UCard>
          </div>

          <!-- Detailed Status Table -->
          <UCard>
            <template #header>
              <h3 class="font-semibold">Template Statistics Summary</h3>
            </template>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                <thead>
                  <tr
                    class="text-left text-xs uppercase text-gray-500 bg-gray-50 dark:bg-gray-900/50"
                  >
                    <th class="py-3 px-4">Template</th>
                    <th class="py-3 px-4 text-right">Delivered</th>
                    <th class="py-3 px-4 text-right">Opened</th>
                    <th class="py-3 px-4 text-right">Clicked</th>
                    <th class="py-3 px-4 text-right">Open Rate</th>
                    <th class="py-3 px-4 text-right">Click Rate</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                  <tr
                    v-for="t in stats?.templatePerformance"
                    :key="t.template"
                    class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td class="py-2 px-4 font-medium">{{ t.template.replace(/_/g, ' ') }}</td>
                    <td class="py-2 px-4 text-right font-mono">
                      {{ t.delivered.toLocaleString() }}
                    </td>
                    <td class="py-2 px-4 text-right font-mono">{{ t.opened.toLocaleString() }}</td>
                    <td class="py-2 px-4 text-right font-mono">{{ t.clicked.toLocaleString() }}</td>
                    <td class="py-2 px-4 text-right font-mono text-emerald-600">
                      {{ t.openRate.toFixed(1) }}%
                    </td>
                    <td class="py-2 px-4 text-right font-mono text-purple-600">
                      {{ t.clickRate.toFixed(1) }}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </UCard>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
