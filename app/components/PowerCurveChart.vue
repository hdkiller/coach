<template>
  <div
    class="bg-white dark:bg-gray-900 rounded-none sm:rounded-xl shadow-none sm:shadow p-6 border-x-0 sm:border-x border-y border-gray-100 dark:border-gray-800"
  >
    <div v-if="loading" class="flex flex-col justify-center items-center py-12">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-4"
      />
      <p class="text-xs font-black uppercase tracking-widest text-gray-500">
        Auditing Power Profile...
      </p>
    </div>

    <div
      v-else-if="!powerData || !chartData.datasets.length"
      class="flex flex-col items-center justify-center py-12 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800"
    >
      <UIcon name="i-heroicons-bolt-slash" class="w-12 h-12 mb-4 text-gray-400 opacity-50" />
      <p
        class="text-[10px] text-gray-500 font-black uppercase tracking-widest leading-relaxed text-center"
      >
        Power Telemetry Unavailable<br />for this session profile.
      </p>
    </div>

    <div v-else class="space-y-8">
      <!-- Legend/Status -->
      <div class="flex items-center justify-center gap-x-8 gap-y-2 mb-2">
        <div class="flex items-center gap-2">
          <div class="w-1.5 h-6 rounded-full bg-emerald-500" />
          <span class="text-[9px] font-black uppercase tracking-widest text-gray-500"
            >Current Distribution</span
          >
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-0.5 border-t border-gray-400 border-dashed" />
          <span class="text-[9px] font-black uppercase tracking-widest text-gray-500"
            >Longitudinal Best</span
          >
        </div>
      </div>

      <!-- Chart Area -->
      <div class="h-[300px] relative">
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
  }>()

  const theme = useTheme()
  const loading = ref(true)
  const powerData = ref<any>(null)

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
            borderColor: '#10b981', // Emerald 500
            backgroundColor: 'transparent',
            borderWidth: 3,
            pointRadius: 0,
            pointHoverRadius: 6,
            tension: 0.4,
            fill: false
          },
          {
            label: 'All Time Best',
            data: mapData(powerData.value.allTime),
            borderColor: '#94a3b8', // Slate 400
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointRadius: 0,
            pointHoverRadius: 0,
            tension: 0.4,
            fill: false
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
            borderColor: '#3b82f6',
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 6,
            tension: 0.4,
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
