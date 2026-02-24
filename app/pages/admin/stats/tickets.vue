<script setup lang="ts">
  import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    BarElement,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
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
    PointElement,
    LineElement,
    Filler
  )

  definePageMeta({
    layout: 'admin',
    middleware: ['auth', 'admin']
  })

  useHead({
    title: 'Ticket Statistics'
  })

  const { data: stats, pending } = await useFetch('/api/admin/stats/tickets')

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

  const statusColors: Record<string, string> = {
    OPEN: '#ef4444', // Red 500
    IN_PROGRESS: '#3b82f6', // Blue 500
    NEED_MORE_INFO: '#f59e0b', // Amber 500
    RESOLVED: '#10b981', // Emerald 500
    CLOSED: '#64748b' // Slate 500
  }

  const priorityColors: Record<string, string> = {
    URGENT: '#7f1d1d', // Dark Red
    HIGH: '#ef4444', // Red
    MEDIUM: '#f59e0b', // Amber
    LOW: '#10b981' // Emerald
  }

  const statusBreakdownData = computed(() => {
    if (!stats.value?.totals) return { labels: [], datasets: [] }
    const labels = Object.keys(stats.value.totals)
    return {
      labels,
      datasets: [
        {
          data: labels.map((l) => (stats.value.totals as any)[l]),
          backgroundColor: labels.map((l) => statusColors[l] || '#cbd5e1')
        }
      ]
    }
  })

  const priorityBreakdownData = computed(() => {
    if (!stats.value?.priorities) return { labels: [], datasets: [] }
    const labels = Object.keys(stats.value.priorities)
    return {
      labels,
      datasets: [
        {
          data: labels.map((l) => (stats.value.priorities as any)[l]),
          backgroundColor: labels.map((l) => priorityColors[l] || '#cbd5e1')
        }
      ]
    }
  })

  const volumeTrendData = computed(() => {
    if (!stats.value?.dailyTrends) return { labels: [], datasets: [] }
    const trends = stats.value.dailyTrends
    return {
      labels: trends.map((t: any) =>
        new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      ),
      datasets: [
        {
          label: 'New Tickets',
          data: trends.map((t: any) => t.count),
          borderColor: '#3b82f6',
          backgroundColor: '#3b82f633',
          fill: true,
          tension: 0.3
        }
      ]
    }
  })
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Ticket Statistics">
        <template #leading>
          <UButton to="/admin/stats" icon="i-lucide-arrow-left" color="neutral" variant="ghost" />
        </template>
        <template #trailing>
          <UButton
            to="/admin/issues"
            label="Manage Tickets"
            icon="i-heroicons-ticket"
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
                  Total Tickets
                </div>
                <div class="text-2xl font-bold font-mono">
                  {{ stats?.summary.total.toLocaleString() || '0' }}
                </div>
              </div>
            </UCard>
            <UCard class="bg-emerald-50/50 dark:bg-emerald-900/10">
              <div class="text-center">
                <div class="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-1">
                  Resolved (30d)
                </div>
                <div class="text-2xl font-bold font-mono">
                  {{ stats?.summary.resolved30d.toLocaleString() || '0' }}
                </div>
              </div>
            </UCard>
            <UCard class="bg-amber-50/50 dark:bg-amber-900/10">
              <div class="text-center">
                <div class="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">
                  Avg Resolution
                </div>
                <div class="text-2xl font-bold font-mono">
                  {{ stats?.summary.avgResolutionDays }} <span class="text-xs">days</span>
                </div>
              </div>
            </UCard>
            <UCard class="bg-red-50/50 dark:bg-red-900/10">
              <div class="text-center">
                <div class="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">
                  Open Tickets
                </div>
                <div class="text-2xl font-bold font-mono">
                  {{ stats?.totals.OPEN || 0 }}
                </div>
              </div>
            </UCard>
          </div>

          <!-- Volume Trend -->
          <UCard>
            <template #header>
              <h3 class="font-semibold">New Tickets Volume (Last 30 Days)</h3>
            </template>
            <div class="h-64 relative">
              <Line :data="volumeTrendData" :options="barOptions" />
            </div>
          </UCard>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Status Breakdown -->
            <UCard>
              <template #header>
                <h3 class="font-semibold">Status Breakdown</h3>
              </template>
              <div class="h-64 relative">
                <Doughnut :data="statusBreakdownData" :options="pieOptions" />
              </div>
            </UCard>

            <!-- Priority Breakdown -->
            <UCard>
              <template #header>
                <h3 class="font-semibold">Priority Breakdown</h3>
              </template>
              <div class="h-64 relative">
                <Pie :data="priorityBreakdownData" :options="pieOptions" />
              </div>
            </UCard>
          </div>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
