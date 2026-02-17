<template>
  <div class="pmc-chart h-full w-full">
    <div v-if="loading" class="flex justify-center items-center h-full">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <div v-else-if="error" class="flex items-center justify-center h-full">
      <p class="text-red-600 dark:text-red-400 font-bold uppercase tracking-widest text-[10px]">
        {{ error }}
      </p>
    </div>

    <div v-else-if="pmcData" class="h-full flex flex-col">
      <!-- Summary Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div
          class="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 sm:p-4 border border-gray-100 dark:border-gray-800"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="text-[10px] font-black uppercase tracking-widest text-gray-400"
              >Fitness (CTL)</span
            >
            <UIcon name="i-heroicons-bolt" class="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            {{ (pmcData.summary?.currentCTL ?? 0).toFixed(1) }}
          </div>
        </div>

        <div
          class="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 sm:p-4 border border-gray-100 dark:border-gray-800"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="text-[10px] font-black uppercase tracking-widest text-gray-400"
              >Fatigue (ATL)</span
            >
            <UIcon name="i-heroicons-fire" class="w-3.5 h-3.5 text-orange-500" />
          </div>
          <div class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            {{ (pmcData.summary?.currentATL ?? 0).toFixed(1) }}
          </div>
        </div>

        <div
          class="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 sm:p-4 border border-gray-100 dark:border-gray-800"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="text-[10px] font-black uppercase tracking-widest text-gray-400"
              >Form (TSB)</span
            >
            <div
              class="w-2 h-2 rounded-full"
              :class="getFormStatusBg(pmcData.summary?.currentTSB ?? 0)"
            />
          </div>
          <div
            class="text-xl sm:text-2xl font-black tracking-tight"
            :class="getFormColorClass(pmcData.summary?.currentTSB ?? 0)"
          >
            {{ (pmcData.summary?.currentTSB ?? 0) > 0 ? '+' : ''
            }}{{ (pmcData.summary?.currentTSB ?? 0).toFixed(1) }}
          </div>
        </div>

        <div
          class="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 sm:p-4 border border-gray-100 dark:border-gray-800"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="text-[10px] font-black uppercase tracking-widest text-gray-400"
              >Avg TSS</span
            >
            <UIcon name="i-heroicons-calculator" class="w-3.5 h-3.5 text-gray-400" />
          </div>
          <div class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            {{ (pmcData.summary?.avgTSS ?? 0).toFixed(1) }}
          </div>
        </div>
      </div>

      <!-- Chart Area -->
      <div class="flex-1 min-h-[300px] relative">
        <Line :data="chartData" :options="chartOptions" :height="300" />
      </div>

      <!-- Legend -->
      <div
        class="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-4 pt-4 border-t border-gray-50 dark:border-gray-800"
      >
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-[#3b82f6]" />
          <span class="text-[10px] font-black uppercase tracking-widest text-gray-500"
            >Fitness</span
          >
        </div>
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-[#f97316]" />
          <span class="text-[10px] font-black uppercase tracking-widest text-gray-500"
            >Fatigue</span
          >
        </div>
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-[#fbbf24]" />
          <span class="text-[10px] font-black uppercase tracking-widest text-gray-500">Form</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { Line } from 'vue-chartjs'
  import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
  } from 'chart.js'

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
  )

  const props = defineProps<{
    days?: number | string
  }>()

  const theme = useTheme()
  const loading = ref(true)
  const error = ref<string | null>(null)
  const pmcData = ref<any>(null)

  // Fetch PMC data
  async function fetchPMCData() {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch('/api/performance/pmc', {
        query: { days: props.days || 90 }
      })
      pmcData.value = data
    } catch (e: any) {
      console.error('Error fetching PMC data:', e)
      error.value = e.data?.message || e.message || 'Failed to load performance metrics'
    } finally {
      loading.value = false
    }
  }

  function getFormColorClass(tsb: number) {
    if (tsb >= 5) return 'text-green-500'
    if (tsb >= -10) return 'text-amber-500'
    return 'text-red-500'
  }

  function getFormStatusBg(tsb: number) {
    if (tsb >= 5) return 'bg-green-500'
    if (tsb >= -10) return 'bg-amber-500'
    return 'bg-red-500'
  }

  // Chart data computed property
  const chartData = computed(() => {
    if (!pmcData.value?.data) return { labels: [], datasets: [] }

    const data = pmcData.value.data
    const labels = data.map((d: any) =>
      new Date(d.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC'
      })
    )

    return {
      labels,
      datasets: [
        {
          label: 'CTL (Fitness)',
          data: data.map((d: any) => d.ctl),
          borderColor: '#3b82f6', // Blue 500
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.4,
          fill: false
        },
        {
          label: 'ATL (Fatigue)',
          data: data.map((d: any) => d.atl),
          borderColor: '#f97316', // Orange 500
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.4,
          fill: false
        },
        {
          label: 'TSB (Form)',
          data: data.map((d: any) => d.tsb),
          borderColor: '#fbbf24', // Amber 400
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.4,
          fill: false
        }
      ]
    }
  })

  // Chart options
  const chartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 10 }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: theme.isDark.value ? '#111827' : '#ffffff',
        titleColor: theme.isDark.value ? '#f3f4f6' : '#111827',
        bodyColor: theme.isDark.value ? '#d1d5db' : '#374151',
        borderColor: theme.isDark.value ? '#374151' : '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        titleFont: { size: 12, weight: 'bold' as const },
        bodyFont: { size: 11 },
        displayColors: true,
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function (context: any) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}`
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#94a3b8',
          font: { size: 10, weight: 'bold' as const },
          maxTicksLimit: 8
        },
        border: { display: false }
      },
      y: {
        position: 'right' as const,
        grid: {
          color: theme.isDark.value ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
          drawTicks: false
        },
        ticks: {
          color: '#94a3b8',
          font: { size: 10, weight: 'bold' as const },
          maxTicksLimit: 6
        },
        border: { display: false }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  }))

  // Watch for days prop changes
  watch(
    () => props.days,
    () => {
      fetchPMCData()
    }
  )

  // Load data on mount
  onMounted(() => {
    fetchPMCData()
  })
</script>

<style scoped>
  .pmc-chart {
    width: 100%;
  }
</style>
