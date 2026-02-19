<template>
  <div class="h-full w-full relative">
    <div v-if="loading" class="flex flex-col justify-center items-center h-[300px]">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-4"
      />
      <p class="text-[10px] font-black uppercase tracking-widest text-gray-500 italic">
        Auditing Power Profile...
      </p>
    </div>

    <div
      v-else-if="!powerData || !chartData.datasets.length"
      class="flex flex-col items-center justify-center h-[300px] bg-gray-50/50 dark:bg-gray-950/20 rounded-xl border border-dashed border-gray-200 dark:border-gray-800"
    >
      <UIcon name="i-heroicons-bolt-slash" class="w-8 h-8 mb-3 text-gray-400 opacity-50" />
      <p
        class="text-[10px] text-gray-500 font-black uppercase tracking-widest leading-relaxed text-center"
      >
        Power Telemetry Unavailable
      </p>
    </div>

    <div v-else class="h-[300px] relative">
      <ClientOnly>
        <Line
          :key="`power-curve-${chartSettings.smooth}-${chartSettings.yScale}`"
          :data="chartData"
          :options="chartOptions"
          :plugins="[ChartDataLabels]"
          :height="300"
        />
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { Line } from 'vue-chartjs'
  import ChartDataLabels from 'chartjs-plugin-datalabels'
  import {
    Chart as ChartJS,
    CategoryScale,
    LogarithmicScale,
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
    LogarithmicScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
  )

  const props = defineProps<{
    // If provided, fetches data for a specific workout
    workoutId?: string
    publicToken?: string

    // If provided, fetches aggregate data for a period (Performance Page mode)
    days?: number | string
    sport?: string
    settings?: any
  }>()

  const theme = useTheme()
  const loading = ref(true)
  const powerData = ref<any>(null)

  const chartSettings = computed(() => ({
    smooth: true,
    showLabels: true,
    yScale: 'dynamic',
    yMin: 0,
    ...props.settings
  }))

  // Format duration labels (e.g., 60s -> 1m)
  const formatDurationLabel = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    return `${Math.floor(seconds / 3600)}h`
  }

  // Fetch power curve data
  async function fetchPowerCurve() {
    loading.value = true

    try {
      let endpoint = ''
      let query = {}

      if (props.publicToken) {
        endpoint = `/api/share/workouts/${props.publicToken}/power-curve`
      } else if (props.workoutId) {
        endpoint = `/api/workouts/${props.workoutId}/power-curve`
      } else {
        // Performance Page Mode
        endpoint = `/api/workouts/power-curve`
        query = {
          days: props.days || 90,
          sport: props.sport
        }
      }

      const data = await $fetch(endpoint, { query })
      powerData.value = data
    } catch (e: any) {
      console.error('Error fetching power curve:', e)
      powerData.value = null
    } finally {
      loading.value = false
    }
  }

  // Watch for prop changes to refetch
  watch(
    () => [props.days, props.sport],
    () => {
      if (!props.workoutId) {
        fetchPowerCurve()
      }
    }
  )

  // Chart data computed property
  const chartData = computed(() => {
    if (!powerData.value) return { labels: [], datasets: [] }

    // Handle Multi-Dataset Format (Performance Page)
    if (powerData.value.current && powerData.value.allTime) {
      // Extract unique durations from both datasets and sort
      const allDurations = new Set([
        ...powerData.value.current.map((p: any) => p.duration),
        ...powerData.value.allTime.map((p: any) => p.duration)
      ])
      const durations = Array.from(allDurations).sort((a: any, b: any) => a - b)
      const labels = durations.map((d: any) => formatDurationLabel(d))

      // Map data to match sorted durations
      const mapData = (sourceData: any[]) => {
        return durations.map((d: any) => {
          const point = sourceData.find((p: any) => p.duration === d)
          return point ? point.watts : null
        })
      }

      return {
        labels,
        datasets: [
          {
            label: 'Current Period',
            data: mapData(powerData.value.current),
            borderColor: theme.colors.value.get('blue', 500),
            backgroundColor: 'transparent',
            borderWidth: 3,
            pointRadius: 0,
            pointHoverRadius: 6,
            tension: chartSettings.value.smooth ? 0.4 : 0,
            fill: false,
            zIndex: 10
          },
          {
            label: 'All Time Best',
            data: mapData(powerData.value.allTime),
            borderColor: theme.isDark.value
              ? 'rgba(148, 163, 184, 0.5)'
              : 'rgba(100, 116, 139, 0.4)',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderDash: [5, 5],
            pointRadius: 0,
            pointHoverRadius: 0,
            tension: chartSettings.value.smooth ? 0.4 : 0,
            fill: false,
            zIndex: 5
          }
        ]
      }
    }

    // Handle Single Workout Format (Legacy/Detailed View)
    if (powerData.value.powerCurve) {
      const curve = powerData.value.powerCurve
      const labels = curve.map((point: any) => point.durationLabel)
      const powers = curve.map((point: any) => point.power)

      return {
        labels,
        datasets: [
          {
            label: 'Max Power (W)',
            data: powers,
            borderColor: theme.colors.value.get('blue', 500),
            backgroundColor: 'transparent',
            borderWidth: 3,
            pointRadius: 0,
            pointHoverRadius: 6,
            tension: chartSettings.value.smooth ? 0.4 : 0,
            fill: false
          }
        ]
      }
    }

    return { labels: [], datasets: [] }
  })

  // Chart options
  const chartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 20, right: 10, bottom: 0, left: 0 }
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          color: '#94a3b8',
          font: { size: 10, weight: 'bold' as const },
          usePointStyle: true,
          boxWidth: 6,
          padding: 20,
          generateLabels: (chart: any) => {
            const generate = Legend.defaults?.labels?.generateLabels
            const original = generate ? generate(chart) : []
            return original.map((label: any) => ({
              ...label,
              text: label.text.toUpperCase()
            }))
          }
        }
      },
      datalabels: {
        display: (context: any) => {
          if (!chartSettings.value.showLabels) return false
          // Only show for certain key durations or peaks to avoid clutter
          const duration = context.chart.data.labels[context.dataIndex]
          const keyDurations = ['1s', '5s', '30s', '1m', '5m', '20m', '1h']
          return context.datasetIndex === 0 && keyDurations.includes(duration)
        },
        color: '#94a3b8',
        align: 'top' as const,
        anchor: 'end' as const,
        offset: 8,
        font: { size: 10, weight: 'bold' as const },
        formatter: (value: any) => `${value}W`
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
            return `${context.dataset.label}: ${context.parsed.y}W`
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
          maxTicksLimit: 10
        },
        border: { display: false }
      },
      y: {
        position: 'right' as const,
        min: chartSettings.value.yScale === 'fixed' ? chartSettings.value.yMin || 0 : undefined,
        grid: {
          color: theme.isDark.value ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
          drawTicks: false
        },
        ticks: {
          color: '#94a3b8',
          font: { size: 10, weight: 'bold' as const },
          maxTicksLimit: 6,
          callback: (value: any) => `${value}W`
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

  // Load data on mount
  onMounted(() => {
    fetchPowerCurve()
  })
</script>

<style scoped>
  .power-curve-chart {
    width: 100%;
  }
</style>
