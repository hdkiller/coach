<script setup lang="ts">
  import { Line, Bar } from 'vue-chartjs'
  import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
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
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
  )

  const props = defineProps<{
    config: any
  }>()

  const theme = useTheme()
  const loading = ref(false)
  const error = ref<string | null>(null)
  const chartData = ref<any>(null)
  const lastFetchedConfig = ref<string | null>(null)

  const chartColors = [
    '#3b82f6', // blue-500
    '#ef4444', // red-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#f97316'  // orange-500
  ]

  async function fetchData() {
    // Only fetch if config actually changed (ignore instanceId which is unique per dashboard instance)
    const currentConfigStr = JSON.stringify({ ...props.config, instanceId: undefined })
    if (lastFetchedConfig.value === currentConfigStr) return
    
    loading.value = true
    error.value = null

    try {
      // Calculate start/end dates based on rolling range if needed
      let startDate = props.config.timeRange?.startDate
      let endDate = props.config.timeRange?.endDate

      if (props.config.timeRange?.type === 'rolling') {
        const val = props.config.timeRange.value // e.g. '90d'
        const days = parseInt(val)
        const now = new Date()
        const start = new Date()
        start.setDate(now.getDate() - days)
        startDate = start.toISOString()
        endDate = now.toISOString()
      } else if (props.config.timeRange?.type === 'ytd') {
        const now = new Date()
        startDate = new Date(now.getFullYear(), 0, 1).toISOString()
        endDate = now.toISOString()
      }

      const response = await $fetch('/api/analytics/query', {
        method: 'POST',
        body: {
          ...props.config,
          timeRange: {
            startDate,
            endDate
          }
        }
      })

      // Transform response into Chart.js format
      chartData.value = {
        labels: (response as any).labels,
        datasets: (response as any).datasets.map((ds: any, index: number) => ({
          ...ds,
          borderColor: ds.color || chartColors[index % chartColors.length],
          backgroundColor: props.config.type === 'bar' 
            ? (ds.color || chartColors[index % chartColors.length]) + '80' // 50% opacity for bar fills
            : 'transparent',
          borderWidth: 2,
          tension: 0.4,
          fill: props.config.type === 'bar',
          pointRadius: (response as any).labels.length > 50 ? 0 : 3
        }))
      }
      lastFetchedConfig.value = currentConfigStr
    } catch (e: any) {
      console.error('[BaseWidget] Data fetch failed:', e)
      error.value = e.data?.statusMessage || e.message || 'Failed to load chart data'
    } finally {
      loading.value = false
    }
  }

  const chartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: props.config.styling?.showLegend !== false,
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          boxWidth: 6,
          boxHeight: 6,
          font: { size: 10, weight: 'bold' as const },
          color: '#94a3b8'
        }
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
        intersect: false
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#94a3b8',
          font: { size: 10, weight: 'bold' as const },
          maxTicksLimit: 8,
          autoSkip: true
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

  watch(() => props.config, fetchData, { deep: true })
  onMounted(fetchData)
</script>

<template>
  <div class="base-widget h-full w-full min-h-[250px]">
    <div v-if="loading" class="flex justify-center items-center h-full min-h-[250px]">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <div v-else-if="error" class="flex flex-col items-center justify-center h-full min-h-[250px] p-4 text-center">
      <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-error-500 mb-2" />
      <p class="text-error-600 dark:text-error-400 font-bold text-sm line-clamp-3">
        {{ error }}
      </p>
      <UButton
        color="neutral"
        variant="link"
        size="xs"
        class="mt-2"
        @click="fetchData"
      />
    </div>

    <div v-else-if="chartData" class="h-full relative p-2">
      <Line
        v-if="config.type === 'line'"
        :data="chartData"
        :options="chartOptions"
      />
      <Bar
        v-else-if="config.type === 'bar'"
        :data="chartData"
        :options="chartOptions"
      />
      <div v-else class="flex items-center justify-center h-full text-neutral-400 text-xs italic">
        Unsupported chart type: {{ config.type }}
      </div>
    </div>
  </div>
</template>
