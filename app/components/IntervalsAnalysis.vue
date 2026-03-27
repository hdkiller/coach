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
    <div v-else-if="data" class="space-y-12">
      <!-- Visual Chart -->
      <div v-if="chartConfig" class="space-y-6">
        <h3 class="font-mono text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em]">
          Dynamic Interval Audit
        </h3>
        <div
          class="h-64 relative bg-white/[0.02] dark:bg-black rounded-2xl border border-white/5 p-4 shadow-inner"
        >
          <Line :data="chartConfig.data" :options="chartConfig.options" :height="250" />
        </div>
      </div>

      <!-- Metrics Overview Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Intervals Count -->
        <div
          class="bg-white/[0.02] dark:bg-black rounded-2xl p-6 border border-white/5 shadow-inner group transition-all hover:bg-white/[0.04]"
        >
          <div
            class="font-mono text-[9px] font-black uppercase tracking-[0.3em] text-primary-500 mb-4"
          >
            Work Intervals
          </div>
          <div
            class="text-4xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter"
          >
            {{ workIntervals.length }}
          </div>
          <div class="font-mono text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-2">
            Duration: {{ formatDuration(totalWorkDuration) }}
          </div>
        </div>

        <!-- Best Effort (Context Aware) -->
        <div
          v-if="bestEffort"
          class="bg-white/[0.02] dark:bg-black rounded-2xl p-6 border border-white/5 shadow-inner group transition-all hover:bg-white/[0.04]"
        >
          <div
            class="font-mono text-[9px] font-black uppercase tracking-[0.3em] text-amber-500 mb-4"
          >
            Peak 5min Effort
          </div>
          <div
            class="text-4xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter"
          >
            {{ String(formatValue(bestEffort.value, bestEffort.metric)).split(' ')[0]
            }}<span class="text-xs ml-1 text-zinc-500">{{
              String(formatValue(bestEffort.value, bestEffort.metric)).split(' ')[1]
            }}</span>
          </div>
          <div
            class="font-mono text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-2 tabular-nums"
          >
            {{ formatTime(bestEffort.start_time) }} - {{ formatTime(bestEffort.end_time) }}
          </div>
        </div>

        <!-- HR Recovery -->
        <div
          v-if="data.recovery"
          class="bg-white/[0.02] dark:bg-black rounded-2xl p-6 border border-white/5 shadow-inner group transition-all hover:bg-white/[0.04]"
        >
          <div
            class="font-mono text-[9px] font-black uppercase tracking-[0.3em] text-emerald-500 mb-4"
          >
            Cardiologic Recovery
          </div>
          <div class="flex items-baseline gap-2">
            <div
              class="text-4xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter"
            >
              -{{ data.recovery.drops }}
            </div>
            <span class="font-mono text-[9px] font-black text-zinc-500 uppercase tracking-widest"
              >bpm / min</span
            >
          </div>
          <div
            class="font-mono text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-2 tabular-nums"
          >
            {{ data.recovery.peakHr }} bpm → {{ data.recovery.recoveryHr }} bpm
          </div>
        </div>
      </div>

      <!-- Intervals Table -->
      <div class="space-y-6">
        <div
          class="flex justify-between items-center group cursor-pointer"
          @click="showTable = !showTable"
        >
          <div class="flex items-center gap-3">
            <h3 class="font-mono text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em]">
              Telemetry Event Log
            </h3>
            <UIcon
              :name="showTable ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
              class="w-4 h-4 text-zinc-500 group-hover:text-primary-500 transition-colors"
            />
          </div>
          <div
            class="px-2 py-0.5 rounded border border-white/10 bg-white/5 font-black uppercase tracking-widest text-[8px] text-zinc-400"
          >
            Audit Mode: {{ data.detectionMetric }}
          </div>
        </div>

        <div v-if="showTable" class="overflow-hidden rounded-2xl border border-white/5 shadow-2xl">
          <table class="min-w-full divide-y divide-white/5">
            <thead class="bg-white/[0.03] dark:bg-black">
              <tr>
                <th
                  scope="col"
                  class="px-6 py-4 text-left font-mono text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]"
                >
                  Metric
                </th>
                <th
                  scope="col"
                  class="px-6 py-4 text-left font-mono text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]"
                >
                  Start
                </th>
                <th
                  scope="col"
                  class="px-6 py-4 text-left font-mono text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]"
                >
                  Duration
                </th>
                <th
                  scope="col"
                  class="px-6 py-4 text-left font-mono text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]"
                >
                  Avg Power
                </th>
                <th
                  scope="col"
                  class="px-6 py-4 text-left font-mono text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]"
                >
                  Avg HR
                </th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-[#09090B] divide-y divide-white/5">
              <tr
                v-for="(interval, index) in data.intervals"
                :key="index"
                :class="interval.type === 'WORK' ? 'bg-primary-500/[0.02]' : ''"
                class="hover:bg-white/[0.02] transition-colors"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div
                    class="inline-block px-2 py-0.5 rounded border font-black uppercase tracking-widest text-[8px]"
                    :class="[
                      interval.type === 'WORK'
                        ? 'border-primary-500/30 text-primary-500 bg-primary-500/5'
                        : interval.type === 'RECOVERY'
                          ? 'border-blue-500/30 text-blue-400 bg-blue-500/5'
                          : 'border-zinc-500/30 text-zinc-400 bg-zinc-500/5'
                    ]"
                  >
                    {{ interval.type }}
                  </div>
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap font-mono text-xs font-medium text-zinc-500 tabular-nums"
                >
                  {{ formatTime(interval.start_time) }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm font-black text-gray-900 dark:text-white tabular-nums"
                >
                  {{ formatDuration(interval.duration) }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm font-black text-gray-900 dark:text-white tabular-nums"
                >
                  <span v-if="interval.avg_power"
                    >{{ Math.round(interval.avg_power)
                    }}<span class="text-[10px] ml-1 text-zinc-500 font-bold uppercase opacity-60"
                      >W</span
                    ></span
                  >
                  <span class="text-zinc-600">-</span>
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm font-black text-gray-900 dark:text-white tabular-nums"
                >
                  <span v-if="interval.avg_heartrate"
                    >{{ Math.round(interval.avg_heartrate) }}
                    <span class="text-[10px] ml-1 text-zinc-500 font-bold uppercase opacity-60"
                      >bpm</span
                    ></span
                  >
                  <span class="text-zinc-600">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Peak Efforts Grid -->
      <div v-if="peakEfforts.length > 0" class="pt-10 border-t border-white/5">
        <h3 class="font-mono text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-8">
          Peak Physiological Tensions
        </h3>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div
            v-for="peak in peakEfforts"
            :key="peak.duration"
            class="p-5 bg-white/[0.01] dark:bg-black border border-white/5 rounded-2xl shadow-inner transition-all hover:bg-white/[0.03] group"
          >
            <div
              class="font-mono text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3 group-hover:text-primary-500 transition-colors"
            >
              {{ peak.duration_label }}
            </div>
            <div
              class="text-xl font-black text-gray-900 dark:text-white tracking-tighter tabular-nums"
            >
              {{ formatValue(peak.value, peak.metric).split(' ')[0]
              }}<span class="text-[10px] ml-1 text-zinc-500">{{
                formatValue(peak.value, peak.metric).split(' ')[1]
              }}</span>
            </div>
            <div
              class="font-mono text-[8px] font-bold text-zinc-600 mt-2 uppercase tracking-widest tabular-nums"
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
