<template>
  <div class="efficiency-trend-chart h-full w-full">
    <div v-if="loading" class="flex justify-center items-center h-full min-h-[300px]">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <div
      v-else-if="!trendData || !trendData.trends || trendData.trends.length === 0"
      class="flex items-center justify-center h-full min-h-[300px] bg-gray-50/50 dark:bg-gray-950/20 rounded-xl border border-dashed border-gray-200 dark:border-gray-800"
    >
      <div class="text-center">
        <UIcon
          name="i-heroicons-bolt-slash"
          class="w-8 h-8 mx-auto mb-3 text-gray-400 opacity-50"
        />
        <p class="text-gray-500 font-black uppercase tracking-widest text-[10px]">
          No efficiency data available
        </p>
      </div>
    </div>

    <div v-else class="h-full flex flex-col">
      <!-- Status Badge -->
      <div class="flex items-center justify-center mb-6">
        <div
          class="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700"
        >
          <span class="text-[10px] font-black uppercase tracking-widest text-gray-400 italic"
            >Trajectory:</span
          >
          <span
            class="text-[10px] font-black uppercase tracking-widest"
            :class="[
              trendDirection === 'IMPROVING'
                ? 'text-green-500'
                : trendDirection === 'DECLINING'
                  ? 'text-red-500'
                  : 'text-blue-500'
            ]"
          >
            {{ trendDirection }}
          </span>
        </div>
      </div>

      <!-- Chart Area -->
      <div class="flex-1 min-h-[300px] relative">
        <Line
          :key="`efficiency-${chartSettings.smooth}-${chartSettings.yScale}`"
          :data="chartData"
          :options="chartOptions"
          :plugins="[ChartDataLabels]"
          :height="300"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { Line } from 'vue-chartjs'
  import ChartDataLabels from 'chartjs-plugin-datalabels'
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
    settings?: any
  }>()

  const theme = useTheme()
  const loading = ref(true)
  const trendData = ref<any>(null)

  const chartSettings = computed(() => ({
    smooth: true,
    showPoints: true,
    showLabels: true,
    yScale: 'dynamic',
    yMin: 0,
    ...props.settings
  }))

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
    if (!trendData.value?.trends || trendData.value.trends.length < 2) return 'STABLE'

    const trends = trendData.value.trends
    // Simple moving average comparison (last 3 vs first 3)
    const window = Math.min(3, Math.floor(trends.length / 3))

    const startAvg =
      trends.slice(0, window).reduce((sum: number, t: any) => sum + t.efficiencyFactor, 0) / window
    const endAvg =
      trends.slice(-window).reduce((sum: number, t: any) => sum + t.efficiencyFactor, 0) / window

    const percentChange = (endAvg - startAvg) / startAvg

    if (percentChange > 0.02) return 'IMPROVING'
    if (percentChange < -0.02) return 'DECLINING'
    return 'STABLE'
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
          borderColor: theme.colors.value.get('purple', 500),
          backgroundColor: 'transparent',
          borderWidth: 3,
          pointRadius: (ctx: any) => (chartSettings.value.showPoints ? 3 : 0),
          pointHoverRadius: 5,
          tension: chartSettings.value.smooth ? 0.4 : 0,
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
      datalabels: {
        display: (context: any) => {
          return chartSettings.value.showLabels && context.datasetIndex === 0
        },
        color: '#94a3b8',
        align: 'top' as const,
        anchor: 'end' as const,
        offset: 4,
        font: { size: 9, weight: 'bold' as const },
        formatter: (value: any) => value.toFixed(2)
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
        boxPadding: 4,
        callbacks: {
          label: function (context: any) {
            return `Efficiency: ${context.parsed.y.toFixed(2)}`
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
        min: chartSettings.value.yScale === 'fixed' ? chartSettings.value.yMin || 0 : undefined,
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
      mode: 'index' as const,
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
