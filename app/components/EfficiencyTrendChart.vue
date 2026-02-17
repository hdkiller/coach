<template>
  <div class="efficiency-trend-chart h-full w-full">
    <div v-if="loading" class="flex justify-center items-center h-full">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <div
      v-else-if="!trendData || !trendData.trends || trendData.trends.length === 0"
      class="flex items-center justify-center h-full"
    >
      <div class="text-center">
        <UIcon name="i-heroicons-chart-bar" class="size-12 mx-auto mb-4 text-gray-400 opacity-50" />
        <p class="text-gray-500 font-bold uppercase tracking-widest text-[10px]">
          No efficiency data available
        </p>
      </div>
    </div>

    <div v-else class="h-full flex flex-col">
      <!-- Status Badge -->
      <div class="flex items-center justify-center mb-6">
        <div
          class="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800"
        >
          <span class="text-[10px] font-black uppercase tracking-widest text-gray-400">Trend:</span>
          <span
            class="text-[10px] font-black uppercase tracking-widest"
            :class="[
              trendDirection === 'up'
                ? 'text-green-500'
                : trendDirection === 'down'
                  ? 'text-red-500'
                  : 'text-blue-500'
            ]"
          >
            {{
              trendDirection === 'up'
                ? 'Improving'
                : trendDirection === 'down'
                  ? 'Declining'
                  : 'Stable'
            }}
          </span>
        </div>
      </div>

      <!-- Chart Area -->
      <div class="flex-1 min-h-[300px] relative">
        <Line :data="chartData" :options="chartOptions" :height="300" />
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
    Filler,
    TimeScale
  } from 'chart.js'
  import 'chartjs-adapter-date-fns'

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    TimeScale
  )

  const props = defineProps<{
    days?: number | string
    sport?: string
  }>()

  const theme = useTheme()
  const loading = ref(true)
  const trendData = ref<any>(null)

  // Fetch efficiency trend data
  async function fetchTrendData() {
    loading.value = true

    try {
      const data = await $fetch('/api/scores/efficiency-trends', {
        query: {
          days: props.days || 90,
          sport: props.sport
        }
      })
      trendData.value = data
    } catch (e: any) {
      console.error('Error fetching efficiency trends:', e)
      trendData.value = null
    } finally {
      loading.value = false
    }
  }

  // Watch for prop changes
  watch(
    () => [props.days, props.sport],
    () => {
      fetchTrendData()
    }
  )

  // Calculate trend direction (simple linear regression slope or start vs end comparison)
  const trendDirection = computed(() => {
    if (!trendData.value?.trends || trendData.value.trends.length < 2) return 'stable'

    const trends = trendData.value.trends
    // Simple moving average comparison (last 3 vs first 3)
    const window = Math.min(3, Math.floor(trends.length / 3))

    const startAvg =
      trends.slice(0, window).reduce((sum: number, t: any) => sum + t.efficiencyFactor, 0) / window
    const endAvg =
      trends.slice(-window).reduce((sum: number, t: any) => sum + t.efficiencyFactor, 0) / window

    const percentChange = (endAvg - startAvg) / startAvg

    if (percentChange > 0.02) return 'up'
    if (percentChange < -0.02) return 'down'
    return 'stable'
  })

  // Chart data
  const chartData = computed(() => {
    if (!trendData.value?.trends) return { labels: [], datasets: [] }

    const trends = trendData.value.trends

    return {
      labels: trends.map((t: any) => t.date),
      datasets: [
        {
          label: 'Efficiency Factor (NP/HR)',
          data: trends.map((t: any) => t.efficiencyFactor),
          borderColor: '#8b5cf6', // Violet 500
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          tension: 0.3,
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
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'day' as const,
          displayFormats: {
            day: 'MMM d'
          }
        },
        grid: {
          display: false
        },
        ticks: {
          color: '#94a3b8',
          font: { size: 10, weight: 'bold' as const },
          maxRotation: 0,
          autoSkip: true,
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

  onMounted(() => {
    fetchTrendData()
  })
</script>

<style scoped>
  .efficiency-trend-chart {
    width: 100%;
  }
</style>
