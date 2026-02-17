<template>
  <div
    class="bg-white dark:bg-gray-900 rounded-none sm:rounded-xl shadow-none sm:shadow p-6 border-x-0 sm:border-x border-y border-gray-100 dark:border-gray-800"
  >
    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-12">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-4"
      />
      <p class="text-xs font-black uppercase tracking-widest text-gray-500">
        Auditing Interval Telemetry...
      </p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-12">
      <UIcon name="i-heroicons-exclamation-triangle" class="w-12 h-12 text-red-500 mx-auto mb-4" />
      <p class="text-sm font-black text-red-600 dark:text-red-400 uppercase tracking-tight">
        {{ error }}
      </p>
    </div>

    <!-- Data Display -->
    <div v-else-if="data" class="space-y-10">
      <!-- Visual Chart -->
      <div v-if="chartConfig" class="space-y-6">
        <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
          Dynamic Interval Audit
        </h3>
        <div
          class="h-64 relative bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 p-4"
        >
          <Line :data="chartConfig.data" :options="chartConfig.options" :height="250" />
        </div>
      </div>

      <!-- Metrics Overview Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Intervals Count -->
        <div
          class="bg-gray-50 dark:bg-gray-950 rounded-xl p-5 border border-gray-100 dark:border-gray-800 group transition-all hover:border-primary-500/30"
        >
          <div
            class="text-[10px] font-black uppercase tracking-widest text-primary-600 dark:text-primary-400 mb-4"
          >
            Work Intervals
          </div>
          <div
            class="text-3xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter"
          >
            {{ workIntervals.length }}
          </div>
          <div class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2">
            Duration: {{ formatDuration(totalWorkDuration) }}
          </div>
        </div>

        <!-- Best Effort (Context Aware) -->
        <div
          v-if="bestEffort"
          class="bg-gray-50 dark:bg-gray-950 rounded-xl p-5 border border-gray-100 dark:border-gray-800 group transition-all hover:border-amber-500/30"
        >
          <div
            class="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-4"
          >
            Peak 5min Effort
          </div>
          <div
            class="text-3xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter"
          >
            {{ formatValue(bestEffort.value, bestEffort.metric) }}
          </div>
          <div
            class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2 tabular-nums"
          >
            {{ formatTime(bestEffort.start_time) }} - {{ formatTime(bestEffort.end_time) }}
          </div>
        </div>

        <!-- HR Recovery -->
        <div
          v-if="data.recovery"
          class="bg-gray-50 dark:bg-gray-950 rounded-xl p-5 border border-gray-100 dark:border-gray-800 group transition-all hover:border-emerald-500/30"
        >
          <div
            class="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-4"
          >
            Cardiologic Recovery
          </div>
          <div class="flex items-baseline gap-2">
            <div
              class="text-3xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter"
            >
              -{{ data.recovery.drops }}
            </div>
            <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest"
              >bpm / min</span
            >
          </div>
          <div
            class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2 tabular-nums"
          >
            {{ data.recovery.peakHr }} bpm → {{ data.recovery.recoveryHr }} bpm
          </div>
        </div>
      </div>

      <!-- Intervals Table -->
      <div class="space-y-4">
        <div
          class="flex justify-between items-center group cursor-pointer"
          @click="showTable = !showTable"
        >
          <div class="flex items-center gap-2">
            <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
              Telemetry Event Log
            </h3>
            <UIcon
              :name="showTable ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
              class="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors"
            />
          </div>
          <UBadge
            color="neutral"
            variant="soft"
            size="xs"
            class="font-black uppercase tracking-widest text-[9px]"
          >
            Audit Mode: {{ data.detectionMetric }}
          </UBadge>
        </div>

        <div
          v-if="showTable"
          class="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800"
        >
          <table class="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
            <thead class="bg-gray-50 dark:bg-gray-950">
              <tr>
                <th
                  scope="col"
                  class="px-5 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest"
                >
                  Metric
                </th>
                <th
                  scope="col"
                  class="px-5 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest"
                >
                  Start
                </th>
                <th
                  scope="col"
                  class="px-5 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest"
                >
                  Duration
                </th>
                <th
                  scope="col"
                  class="px-5 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest"
                >
                  Avg Power
                </th>
                <th
                  scope="col"
                  class="px-5 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest"
                >
                  Avg HR
                </th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
              <tr
                v-for="(interval, index) in data.intervals"
                :key="index"
                :class="interval.type === 'WORK' ? 'bg-primary-50/20 dark:bg-primary-900/10' : ''"
              >
                <td class="px-5 py-4 whitespace-nowrap">
                  <UBadge
                    :color="getIntervalColor(interval.type)"
                    variant="soft"
                    size="xs"
                    class="font-black uppercase tracking-widest text-[9px]"
                  >
                    {{ interval.type }}
                  </UBadge>
                </td>
                <td
                  class="px-5 py-4 whitespace-nowrap text-xs font-medium text-gray-500 dark:text-gray-400 tabular-nums"
                >
                  {{ formatTime(interval.start_time) }}
                </td>
                <td
                  class="px-5 py-4 whitespace-nowrap text-xs font-black text-gray-900 dark:text-white tabular-nums"
                >
                  {{ formatDuration(interval.duration) }}
                </td>
                <td
                  class="px-5 py-4 whitespace-nowrap text-xs font-black text-gray-900 dark:text-white tabular-nums"
                >
                  <span v-if="interval.avg_power"
                    >{{ Math.round(interval.avg_power)
                    }}<span class="text-[9px] ml-0.5 text-gray-400">W</span></span
                  >
                  <span v-else class="text-gray-400">-</span>
                </td>
                <td
                  class="px-5 py-4 whitespace-nowrap text-xs font-black text-gray-900 dark:text-white tabular-nums"
                >
                  <span v-if="interval.avg_heartrate"
                    >{{ Math.round(interval.avg_heartrate) }}
                    <span class="text-[9px] ml-0.5 text-gray-400 uppercase">bpm</span></span
                  >
                  <span v-else class="text-gray-400">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Peak Efforts Grid -->
      <div v-if="peakEfforts.length > 0" class="pt-8 border-t border-gray-100 dark:border-gray-800">
        <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">
          Peak Physiological Tensions
        </h3>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div
            v-for="peak in peakEfforts"
            :key="peak.duration"
            class="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm transition-all hover:border-primary-500/30 group"
          >
            <div
              class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 group-hover:text-primary-500 transition-colors"
            >
              {{ peak.duration_label }}
            </div>
            <div
              class="text-xl font-black text-gray-900 dark:text-white tracking-tight tabular-nums"
            >
              {{ formatValue(peak.value, peak.metric) }}
            </div>
            <div
              class="text-[9px] font-bold text-gray-400 mt-2 uppercase tracking-widest tabular-nums"
            >
              {{ formatTime(peak.start_time) }}
            </div>
          </div>
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
  import annotationPlugin from 'chartjs-plugin-annotation'

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    annotationPlugin
  )

  const props = defineProps<{
    workoutId: string
    publicToken?: string
  }>()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const data = ref<any>(null)
  const showTable = ref(false)

  // Fetch interval data
  async function fetchIntervals() {
    loading.value = true
    error.value = null
    try {
      const endpoint = props.publicToken
        ? `/api/share/workouts/${props.publicToken}/intervals`
        : `/api/workouts/${props.workoutId}/intervals`

      data.value = await $fetch(endpoint)
    } catch (e: any) {
      console.error('Error fetching intervals:', e)
      error.value = e.data?.message || 'Failed to load interval analysis'
    } finally {
      loading.value = false
    }
  }

  // Chart Configuration
  const chartConfig = computed(() => {
    if (!data.value?.chartData) return null

    const isDark = document.documentElement.classList.contains('dark')
    const metric = data.value.detectionMetric || 'power'

    // Choose dataset based on detection metric
    let datasetLabel = 'Power'
    let datasetData = data.value.chartData.power
    let color = 'rgb(168, 85, 247)' // Purple
    let unit = 'W'

    if (metric === 'heartrate' || (!datasetData.length && data.value.chartData.heartrate.length)) {
      datasetLabel = 'Heart Rate'
      datasetData = data.value.chartData.heartrate
      color = 'rgb(239, 68, 68)' // Red
      unit = 'bpm'
    } else if (metric === 'pace' || (!datasetData.length && data.value.chartData.pace.length)) {
      datasetLabel = 'Pace'
      datasetData = data.value.chartData.pace
      color = 'rgb(59, 130, 246)' // Blue
      unit = 'm/s'
    }

    // Create annotations for intervals
    const annotations: any = {}

    if (data.value.intervals) {
      data.value.intervals.forEach((interval: any, index: number) => {
        if (interval.type === 'WORK') {
          annotations[`box${index}`] = {
            type: 'box',
            xMin: formatTime(interval.start_time),
            xMax: formatTime(interval.end_time),
            backgroundColor: isDark ? 'rgba(74, 222, 128, 0.1)' : 'rgba(74, 222, 128, 0.2)', // Green tint
            borderWidth: 0
          }
        }
      })
    }

    return {
      data: {
        labels: data.value.chartData.time.map((t: number) => formatTime(t)),
        datasets: [
          {
            label: datasetLabel,
            data: datasetData,
            borderColor: color,
            backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
            borderWidth: 1.5,
            pointRadius: 0,
            pointHoverRadius: 4,
            fill: true,
            tension: 0.2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index' as const,
          intersect: false
        },
        plugins: {
          annotation: {
            annotations
          },
          legend: {
            display: true,
            labels: {
              color: isDark ? '#9CA3AF' : '#4B5563'
            }
          },
          tooltip: {
            callbacks: {
              label: function (context: any) {
                return `${context.dataset.label}: ${Math.round(context.parsed.y)} ${unit}`
              },
              afterBody: function (tooltipItems: any[]) {
                // Find if we are hovering over an interval
                const index = tooltipItems[0].dataIndex
                const time = data.value.chartData.time[index]

                const interval = data.value.intervals.find(
                  (i: any) => i.start_time <= time && i.end_time >= time && i.type === 'WORK'
                )

                if (interval) {
                  return [
                    '',
                    `Interval: ${formatDuration(interval.duration)}`,
                    `Avg Power: ${Math.round(interval.avg_power || 0)}W`,
                    `Avg HR: ${Math.round(interval.avg_heartrate || 0)} bpm`
                  ]
                }
                return []
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
              color: isDark ? '#9CA3AF' : '#6B7280',
              maxTicksLimit: 8
            }
          },
          y: {
            grid: {
              color: isDark ? 'rgba(75, 85, 99, 0.2)' : 'rgba(209, 213, 219, 0.4)'
            },
            ticks: {
              color: isDark ? '#9CA3AF' : '#6B7280'
            }
          }
        }
      }
    }
  })

  // Computed properties for display logic
  const workIntervals = computed(() => {
    return data.value?.intervals.filter((i: any) => i.type === 'WORK') || []
  })

  const totalWorkDuration = computed(() => {
    return workIntervals.value.reduce((sum: number, i: any) => sum + i.duration, 0)
  })

  const bestEffort = computed(() => {
    if (!data.value?.peaks) return null

    // Prefer Power > Pace > HR
    const peaks =
      data.value.peaks.power.length > 0
        ? data.value.peaks.power
        : data.value.peaks.pace.length > 0
          ? data.value.peaks.pace
          : data.value.peaks.heartrate

    // Return 5min effort (index 3 usually: 5s, 30s, 1m, 5m...) or best available
    return peaks.find((p: any) => p.duration === 300) || peaks[0]
  })

  const peakEfforts = computed(() => {
    if (!data.value?.peaks) return []
    return data.value.peaks.power.length > 0
      ? data.value.peaks.power
      : data.value.peaks.pace.length > 0
        ? data.value.peaks.pace
        : data.value.peaks.heartrate
  })

  const hasPace = computed(() => {
    return data.value?.intervals.some((i: any) => i.avg_pace)
  })

  // Helper functions
  function getIntervalColor(type: string) {
    switch (type) {
      case 'WORK':
        return 'primary'
      case 'RECOVERY':
        return 'neutral'
      case 'WARMUP':
        return 'warning'
      case 'COOLDOWN':
        return 'info'
      default:
        return 'neutral'
    }
  }

  function formatDuration(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    if (mins > 60) {
      const hours = Math.floor(mins / 60)
      const remainingMins = mins % 60
      return `${hours}h ${remainingMins}m`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  function formatValue(val: number, metric: string) {
    if (metric === 'power') return `${Math.round(val)}W`
    if (metric === 'heartrate') return `${Math.round(val)} bpm`
    if (metric === 'pace') return formatPace(val)
    return val
  }

  function formatPace(mps: number) {
    if (!mps) return '-'
    const paceMinPerKm = 16.6667 / mps // convert m/s to min/km (1000m / 60s = 16.66)
    const mins = Math.floor(paceMinPerKm)
    const secs = Math.round((paceMinPerKm - mins) * 60)
    return `${mins}:${secs.toString().padStart(2, '0')}/km`
  }

  onMounted(() => {
    fetchIntervals()
  })
</script>
