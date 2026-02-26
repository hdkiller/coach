<template>
  <UModal
    v-model:open="isOpen"
    :title="metricInfo.label"
    :ui="{ content: 'sm:max-w-3xl' }"
    :description="modalDescription"
  >
    <template #body>
      <div class="space-y-6">
        <!-- Header: Value & Rating -->
        <div class="flex items-center justify-between">
          <div class="flex flex-col">
            <span class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">
              Current Session Value
            </span>
            <div
              class="text-4xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter"
            >
              {{ value
              }}<span v-if="unit" class="text-lg ml-1 text-gray-400 uppercase">{{ unit }}</span>
            </div>
            <div
              v-if="hasComparisonStats"
              class="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2"
            >
              <div
                class="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50/70 dark:bg-gray-800/40"
              >
                <div class="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  7d Avg
                </div>
                <div class="mt-1 flex items-center gap-2">
                  <span class="text-sm font-black text-gray-900 dark:text-white">
                    {{ formatComparisonValue(avg7d) }}
                  </span>
                  <span
                    v-if="delta7d !== null"
                    class="text-[10px] font-black uppercase tracking-widest"
                    :class="delta7d >= 0 ? 'text-emerald-500' : 'text-rose-500'"
                  >
                    {{ delta7d >= 0 ? '↑' : '↓' }} {{ formatPercent(delta7d) }}
                  </span>
                </div>
              </div>
              <div
                class="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50/70 dark:bg-gray-800/40"
              >
                <div class="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  45d Avg
                </div>
                <div class="mt-1 flex items-center gap-2">
                  <span class="text-sm font-black text-gray-900 dark:text-white">
                    {{ formatComparisonValue(avg45d) }}
                  </span>
                  <span
                    v-if="delta45d !== null"
                    class="text-[10px] font-black uppercase tracking-widest"
                    :class="delta45d >= 0 ? 'text-emerald-500' : 'text-rose-500'"
                  >
                    {{ delta45d >= 0 ? '↑' : '↓' }} {{ formatPercent(delta45d) }}
                  </span>
                </div>
              </div>
              <div
                class="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50/70 dark:bg-gray-800/40"
              >
                <div class="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  45d Min
                </div>
                <div class="mt-1 flex items-center gap-2">
                  <span class="text-sm font-black text-gray-900 dark:text-white">
                    {{ formatComparisonValue(min45d) }}
                  </span>
                </div>
              </div>
              <div
                class="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50/70 dark:bg-gray-800/40"
              >
                <div class="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  45d Max
                </div>
                <div class="mt-1 flex items-center gap-2">
                  <span class="text-sm font-black text-gray-900 dark:text-white">
                    {{ formatComparisonValue(max45d) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div v-if="rating" class="text-right">
            <UBadge
              :color="ratingColor"
              variant="soft"
              size="md"
              class="font-black uppercase tracking-widest text-[10px] px-3 py-1"
            >
              {{ rating }}
            </UBadge>
            <div class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2">
              Qualitative Assessment
            </div>
          </div>
        </div>

        <!-- Metric Explanation -->
        <div
          class="bg-gray-50 dark:bg-gray-950 rounded-xl p-5 border border-gray-100 dark:border-gray-800"
        >
          <h4
            class="text-[10px] font-black uppercase tracking-widest text-primary-500 mb-3 flex items-center gap-2"
          >
            <UIcon name="i-heroicons-information-circle" class="w-4 h-4" />
            Understanding this metric
          </h4>
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed">
            {{ metricInfo.description }}
          </p>
          <div
            v-if="metricInfo.coachingTip"
            class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800"
          >
            <p class="text-[11px] italic text-gray-500 dark:text-gray-400">
              <span
                class="font-black uppercase tracking-widest not-italic mr-1 text-[9px] text-gray-400"
                >Coach Watts:</span
              >
              {{ metricInfo.coachingTip }}
            </p>
          </div>
        </div>

        <!-- Dynamic Visualization (Chart) -->
        <div v-if="hasStreamData && streamData.length > 0" class="space-y-4">
          <h4
            class="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"
          >
            <UIcon name="i-heroicons-chart-bar" class="w-4 h-4" />
            Session Timeline
          </h4>
          <div
            class="h-[280px] w-full bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4"
          >
            <ClientOnly>
              <BaseStreamChart
                :label="metricInfo.label"
                :data-points="streamData"
                :labels="sessionTimeData"
                :color="chartColor"
                :y-axis-label="chartUnit"
                height-class="h-full"
                x-axis-label="Time (min)"
              />
            </ClientOnly>
          </div>
          <p class="text-[9px] text-gray-400 font-bold uppercase tracking-widest text-center">
            Detailed distribution of this metric across the entire session duration
          </p>
        </div>

        <!-- Historical Comparison -->
        <div v-if="history.points.length > 0" class="space-y-4">
          <h4
            class="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"
          >
            <UIcon name="i-heroicons-clock" class="w-4 h-4" />
            Previous {{ history.activityType || 'Same Type' }} Sessions
          </h4>
          <div class="space-y-4">
            <div
              class="h-[220px] w-full bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4"
            >
              <ClientOnly>
                <BaseStreamChart
                  :label="`${metricInfo.label} Trend`"
                  :data-points="historyChartValues"
                  :labels="historyChartLabels"
                  :color="chartColor"
                  :y-axis-label="chartUnit"
                  height-class="h-full"
                  x-axis-label="Date"
                  x-axis-type="category"
                />
              </ClientOnly>
            </div>

            <div
              class="bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800"
            >
              <NuxtLink
                v-for="point in history.points"
                :key="point.workoutId"
                :to="`/workouts/${point.workoutId}`"
                class="px-4 py-3 flex items-center justify-between hover:bg-gray-100/70 dark:hover:bg-gray-900/70 transition-colors"
              >
                <div class="min-w-0">
                  <div class="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {{ point.title }}
                  </div>
                  <div class="text-[10px] text-gray-500 uppercase tracking-widest font-black">
                    {{ formatHistoryDate(point.date) }}
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-base font-black text-gray-900 dark:text-white tabular-nums">
                    {{ formatHistoryValue(point.value) }}
                  </div>
                  <div class="text-[10px] text-primary-500 uppercase font-black tracking-widest">
                    Open
                  </div>
                </div>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <UButton
        label="Close Audit"
        color="neutral"
        variant="ghost"
        class="font-black uppercase tracking-widest text-[10px]"
        @click="isOpen = false"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
  import { metricDefinitions } from '~/utils/metrics'
  import { metricTooltips } from '~/utils/tooltips'
  import BaseStreamChart from '../charts/streams/BaseStreamChart.vue'

  const props = defineProps<{
    modelValue: boolean
    metricKey: string
    value: string | number
    unit?: string
    rating?: string
    ratingColor?: 'success' | 'warning' | 'error' | 'neutral'
    workoutId: string
    streams?: any
  }>()

  const emit = defineEmits(['update:modelValue'])

  const isOpen = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
  })

  const metricAliases: Record<string, string> = {
    'Average Power': 'Avg Power',
    'Normalized Power': 'Norm Power',
    Decoupling: 'Aerobic Decoupling',
    'CTL (Fitness)': 'Fitness (CTL)',
    'ATL (Fatigue)': 'Fatigue (ATL)',
    'TSB (Form)': 'Form (TSB)',
    'IF (Intensity Factor)': 'Intensity Factor'
  }

  const normalizedMetricKey = computed(() => props.metricKey.trim().toLowerCase())

  const isPowerHrRatioMetric = computed(
    () =>
      normalizedMetricKey.value === 'power/hr ratio' ||
      normalizedMetricKey.value === 'power hr ratio'
  )

  const metricInfo = computed(() => {
    const direct = metricDefinitions[props.metricKey]
    if (direct) return direct

    const aliasKey = metricAliases[props.metricKey]
    if (aliasKey && metricDefinitions[aliasKey]) {
      return {
        ...metricDefinitions[aliasKey],
        label: props.metricKey
      }
    }

    const fallbackDescription =
      metricTooltips[props.metricKey] || (aliasKey ? metricTooltips[aliasKey] : undefined)

    return {
      label: props.metricKey || 'Metric Detail',
      description: fallbackDescription || 'Additional context for this metric is not available yet.'
    }
  })

  const modalDescription = computed(
    () => `${metricInfo.value.label} explanation and session chart.`
  )

  const streamKey = computed(() => {
    if (isPowerHrRatioMetric.value) return null

    const key = normalizedMetricKey.value
    if (key.includes('hr')) return 'heartrate'
    if (key.includes('cadence')) return 'cadence'
    if (key.includes('power') || key === 'np' || key === 'tss' || key.includes('load'))
      return 'watts'
    if (key.includes('pace') || key.includes('consistency') || key.includes('velocity'))
      return 'velocity'
    return null
  })

  const hasStreamData = computed(() => {
    if (isPowerHrRatioMetric.value) {
      const watts = props.streams?.watts
      const heartrate = props.streams?.heartrate
      return (
        Array.isArray(watts) && Array.isArray(heartrate) && watts.length > 0 && heartrate.length > 0
      )
    }

    return !!streamKey.value
  })

  const streamData = computed(() => {
    if (!props.streams) return []

    if (isPowerHrRatioMetric.value) {
      const watts = Array.isArray(props.streams.watts) ? props.streams.watts : []
      const heartrate = Array.isArray(props.streams.heartrate) ? props.streams.heartrate : []
      const len = Math.min(watts.length, heartrate.length)
      if (len === 0) return []

      return Array.from({ length: len }, (_, index) => {
        const power = Number(watts[index])
        const hr = Number(heartrate[index])
        if (!Number.isFinite(power) || !Number.isFinite(hr) || hr <= 0) return 0
        return Number((power / hr).toFixed(3))
      })
    }

    if (!streamKey.value) return []
    return props.streams[streamKey.value] || []
  })

  const timeData = computed(() => {
    if (!props.streams?.time) return []

    if (isPowerHrRatioMetric.value) {
      return props.streams.time.slice(0, streamData.value.length)
    }

    return props.streams.time
  })

  const sessionTimeData = computed(() => {
    return timeData.value.map((value: number) => Number(value) / 60)
  })

  const chartUnit = computed(() => {
    if (props.unit) return props.unit
    if (isPowerHrRatioMetric.value) return 'W/bpm'
    if (streamKey.value === 'heartrate') return 'bpm'
    if (streamKey.value === 'watts') return 'W'
    if (streamKey.value === 'velocity') return 'm/s'
    if (streamKey.value === 'cadence') return 'rpm'
    return ''
  })

  const chartColor = computed(() => {
    if (isPowerHrRatioMetric.value) return '#f97316' // orange
    if (streamKey.value === 'heartrate') return '#ef4444' // pink/red
    if (streamKey.value === 'watts') return '#8b5cf6' // purple
    if (streamKey.value === 'velocity') return '#3b82f6' // blue
    return '#3b82f6'
  })

  type HistoryPoint = {
    workoutId: string
    date: string
    title: string
    value: number
  }

  const history = ref<{
    activityType: string | null
    currentDate: string | null
    points: HistoryPoint[]
  }>({
    activityType: null,
    currentDate: null,
    points: []
  })

  const historyChartPoints = computed(() => [...history.value.points].reverse())
  const historyChartValues = computed(() => historyChartPoints.value.map((p) => p.value))
  const historyChartLabels = computed(() =>
    historyChartPoints.value.map((p) => {
      const d = new Date(p.date)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })
  )

  function formatHistoryDate(value: string) {
    const date = new Date(value)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function formatHistoryValue(value: number) {
    const rounded = Number.isInteger(value) ? value.toString() : value.toFixed(1)
    return chartUnit.value ? `${rounded} ${chartUnit.value}` : rounded
  }

  function parseCurrentValue(raw: string | number): number | null {
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw
    if (typeof raw !== 'string') return null
    const numeric = Number(raw.replace(/[^0-9.+-]/g, ''))
    return Number.isFinite(numeric) ? numeric : null
  }

  function computeAverageInDays(days: number): number | null {
    const anchor = history.value.currentDate ? new Date(history.value.currentDate) : new Date()
    const from = new Date(anchor)
    from.setDate(anchor.getDate() - days)
    const values = history.value.points
      .filter((point) => {
        const d = new Date(point.date)
        return d >= from && d < anchor
      })
      .map((point) => point.value)
      .filter((v) => Number.isFinite(v))

    if (!values.length) return null
    return values.reduce((sum, v) => sum + v, 0) / values.length
  }

  function getValuesInDays(days: number): number[] {
    const anchor = history.value.currentDate ? new Date(history.value.currentDate) : new Date()
    const from = new Date(anchor)
    from.setDate(anchor.getDate() - days)
    return history.value.points
      .filter((point) => {
        const d = new Date(point.date)
        return d >= from && d < anchor
      })
      .map((point) => point.value)
      .filter((v) => Number.isFinite(v))
  }

  const currentNumericValue = computed(() => parseCurrentValue(props.value))
  const avg7d = computed(() => computeAverageInDays(7))
  const avg45d = computed(() => computeAverageInDays(45))
  const min45d = computed(() => {
    const values = getValuesInDays(45)
    if (!values.length) return null
    return Math.min(...values)
  })
  const max45d = computed(() => {
    const values = getValuesInDays(45)
    if (!values.length) return null
    return Math.max(...values)
  })

  const delta7d = computed(() => {
    if (currentNumericValue.value === null || avg7d.value === null || avg7d.value === 0) return null
    return ((currentNumericValue.value - avg7d.value) / avg7d.value) * 100
  })

  const delta45d = computed(() => {
    if (currentNumericValue.value === null || avg45d.value === null || avg45d.value === 0)
      return null
    return ((currentNumericValue.value - avg45d.value) / avg45d.value) * 100
  })

  const hasComparisonStats = computed(
    () =>
      avg7d.value !== null ||
      avg45d.value !== null ||
      min45d.value !== null ||
      max45d.value !== null
  )

  function formatComparisonValue(value: number | null) {
    if (value === null) return '-'
    const rounded = Number.isInteger(value) ? value.toString() : value.toFixed(1)
    return chartUnit.value ? `${rounded} ${chartUnit.value}` : rounded
  }

  function formatPercent(value: number) {
    return `${Math.abs(value).toFixed(1)}%`
  }

  async function fetchMetricHistory() {
    if (!props.workoutId || !props.metricKey) return

    try {
      const result = await $fetch(`/api/workouts/${props.workoutId}/metric-history`, {
        query: {
          metricKey: props.metricKey,
          limit: 12
        }
      })
      history.value = {
        activityType: (result as any)?.activityType || null,
        currentDate: (result as any)?.currentDate || null,
        points: ((result as any)?.points || []) as HistoryPoint[]
      }
    } catch (e: any) {
      history.value = { activityType: null, currentDate: null, points: [] }
    }
  }

  watch(
    () => [isOpen.value, props.metricKey, props.workoutId],
    ([open]) => {
      if (!open) return
      fetchMetricHistory()
    },
    { immediate: true }
  )
</script>
