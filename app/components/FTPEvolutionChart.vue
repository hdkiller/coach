<template>
  <div class="ftp-evolution-chart h-full w-full">
    <div v-if="loading" class="flex justify-center items-center h-full min-h-[400px]">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <div v-else-if="error" class="flex items-center justify-center h-full min-h-[400px]">
      <p class="text-red-600 dark:text-red-400 font-bold uppercase tracking-widest text-[10px]">
        {{ error }}
      </p>
    </div>

    <div v-else-if="ftpData" class="h-full flex flex-col">
      <div
        v-if="ftpData.data.length === 0"
        class="flex items-center justify-center h-full min-h-[400px]"
      >
        <div class="text-center">
          <UIcon
            name="i-heroicons-chart-bar-square"
            class="w-12 h-12 mx-auto mb-4 text-gray-400 opacity-50"
          />
          <p class="text-gray-500 font-bold uppercase tracking-widest text-[10px]">
            No progression data available
          </p>
        </div>
      </div>

      <div v-else class="space-y-8">
        <!-- Summary Stats -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div
            class="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 sm:p-4 border border-gray-100 dark:border-gray-800"
          >
            <div class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
              Current FTP
            </div>
            <div
              class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight"
            >
              {{ ftpData.summary.currentFTP || '-'
              }}<span class="text-xs ml-1 text-gray-400">W</span>
            </div>
          </div>

          <div
            class="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 sm:p-4 border border-gray-100 dark:border-gray-800"
          >
            <div class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
              Peak FTP
            </div>
            <div
              class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight"
            >
              {{ ftpData.summary.peakFTP || '-' }}<span class="text-xs ml-1 text-gray-400">W</span>
            </div>
          </div>

          <div
            class="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 sm:p-4 border border-gray-100 dark:border-gray-800"
          >
            <div class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
              Starting FTP
            </div>
            <div
              class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight"
            >
              {{ ftpData.summary.startingFTP || '-'
              }}<span class="text-xs ml-1 text-gray-400">W</span>
            </div>
          </div>

          <div
            class="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 sm:p-4 border border-gray-100 dark:border-gray-800"
          >
            <div class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
              Improvement
            </div>
            <div
              class="text-xl sm:text-2xl font-black tracking-tight"
              :class="ftpData.summary.improvement >= 0 ? 'text-green-500' : 'text-red-500'"
            >
              {{
                ftpData.summary.improvement !== null
                  ? (ftpData.summary.improvement > 0 ? '+' : '') + ftpData.summary.improvement + '%'
                  : '-'
              }}
            </div>
          </div>
        </div>

        <!-- Chart -->
        <div class="flex-1 min-h-[300px] relative">
          <Line :data="chartData" :options="chartOptions" :height="300" />
        </div>

        <!-- Info Section -->
        <div
          class="p-4 bg-primary-50 dark:bg-primary-950/20 rounded-xl border border-primary-100 dark:border-primary-900/50"
        >
          <h4
            class="text-[10px] font-black uppercase tracking-widest text-primary-600 dark:text-primary-400 mb-2 flex items-center gap-2"
          >
            <UIcon name="i-heroicons-information-circle" class="size-4" />
            Performance Metric: FTP
          </h4>
          <p class="text-xs text-primary-800 dark:text-primary-200 leading-relaxed font-medium">
            Functional Threshold Power represents the maximum intensity you can maintain for
            approximately one hour. It serves as the baseline for your personalized training zones.
          </p>
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
    months?: number | string
    sport?: string
  }>()

  const theme = useTheme()
  const loading = ref(true)
  const error = ref<string | null>(null)
  const ftpData = ref<any>(null)

  // Fetch FTP evolution data
  async function fetchFTPData() {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch('/api/performance/ftp-evolution', {
        query: {
          months: props.months || 12,
          sport: props.sport
        }
      })
      ftpData.value = data
    } catch (e: any) {
      console.error('Error fetching FTP data:', e)
      error.value = e.data?.message || e.message || 'Failed to load progression data'
    } finally {
      loading.value = false
    }
  }

  // Chart data computed property
  const chartData = computed(() => {
    if (!ftpData.value?.data || ftpData.value.data.length === 0) {
      return { labels: [], datasets: [] }
    }

    const data = ftpData.value.data
    const labels = data.map((d: any) => d.month)
    const ftpValues = data.map((d: any) => d.ftp)

    return {
      labels,
      datasets: [
        {
          label: 'FTP (W)',
          data: ftpValues,
          borderColor: '#3b82f6', // Blue 500
          backgroundColor: 'transparent',
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: theme.isDark.value ? '#111827' : '#fff',
          pointBorderWidth: 2,
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
        callbacks: {
          label: function (context: any) {
            return `FTP: ${context.parsed.y}W`
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#94a3b8',
          font: { size: 10, weight: 'bold' as const }
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
          font: { size: 10, weight: 'bold' as const }
        },
        border: { display: false },
        beginAtZero: false
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  }))

  // Watch for prop changes
  watch(
    () => [props.months, props.sport],
    () => {
      fetchFTPData()
    }
  )

  // Load data on mount
  onMounted(() => {
    fetchFTPData()
  })
</script>

<style scoped>
  .ftp-evolution-chart {
    width: 100%;
  }
</style>
