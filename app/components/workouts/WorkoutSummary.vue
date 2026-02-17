<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
    <button
      v-for="key in metricOrder"
      :key="key"
      class="rounded-xl p-3 sm:p-4 border text-left transition-colors"
      :class="metricCards[key].cardClass"
      @click="emit('open-metric', key)"
    >
      <div class="flex items-center justify-between mb-1">
        <span
          class="text-[10px] font-black uppercase tracking-widest"
          :class="metricCards[key].labelClass"
        >
          {{ metricCards[key].label }}
        </span>
        <UIcon :name="metricCards[key].icon" class="size-3.5" :class="metricCards[key].iconClass" />
      </div>

      <div class="flex items-baseline gap-1">
        <div class="text-2xl font-black tracking-tight" :class="metricCards[key].valueClass">
          {{ metricValueLabel(key) }}
        </div>
        <span
          v-if="metricCards[key].unit && metricValueLabel(key) !== '-'"
          class="text-xs font-black uppercase"
          :class="metricCards[key].iconClass"
        >
          {{ metricCards[key].unit }}
        </span>
      </div>

      <div v-if="metricTrend(key)" class="mt-1 flex items-center gap-1">
        <UIcon :name="metricTrend(key)!.icon" class="size-3" :class="metricTrend(key)!.color" />
        <span
          class="text-[10px] font-bold uppercase tracking-tighter"
          :class="metricTrend(key)!.color"
        >
          {{ trendLabel(key) }}
        </span>
      </div>
      <div
        v-else
        class="mt-1 text-[10px] font-bold uppercase tracking-tighter text-gray-500 dark:text-gray-400"
      >
        No baseline
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
  import type { TrendType } from '~/composables/useTrend'

  type MetricKey = 'totalWorkouts' | 'analyzedWorkouts' | 'avgScore' | 'totalHours'
  type TrendItem = { previous: number; type?: TrendType }

  const props = defineProps<{
    totalWorkouts: number
    analyzedWorkouts: number
    avgScore: number | null
    totalHours: number
    trends?: {
      totalWorkouts?: TrendItem
      analyzedWorkouts?: TrendItem
      avgScore?: TrendItem
      totalHours?: TrendItem
    }
  }>()

  const emit = defineEmits<{
    'open-metric': [metric: MetricKey]
  }>()

  const { calculateTrend } = useTrend()

  const metricOrder: MetricKey[] = ['totalWorkouts', 'analyzedWorkouts', 'avgScore', 'totalHours']

  const metricCards = {
    totalWorkouts: {
      label: 'Total Workouts',
      icon: 'i-heroicons-chart-bar',
      cardClass: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50',
      valueClass: 'text-blue-600 dark:text-blue-400',
      labelClass: 'text-blue-600 dark:text-blue-400',
      iconClass: 'text-blue-500',
      unit: ''
    },
    analyzedWorkouts: {
      label: 'AI Analyzed',
      icon: 'i-heroicons-sparkles',
      cardClass:
        'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50',
      valueClass: 'text-emerald-600 dark:text-emerald-400',
      labelClass: 'text-emerald-600 dark:text-emerald-400',
      iconClass: 'text-emerald-500',
      unit: ''
    },
    avgScore: {
      label: 'Avg Score',
      icon: 'i-heroicons-star',
      cardClass: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50',
      valueClass: 'text-amber-600 dark:text-amber-400',
      labelClass: 'text-amber-600 dark:text-amber-400',
      iconClass: 'text-amber-500',
      unit: ''
    },
    totalHours: {
      label: 'Total Volume',
      icon: 'i-heroicons-clock',
      cardClass: 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800/50',
      valueClass: 'text-purple-600 dark:text-purple-400',
      labelClass: 'text-purple-600 dark:text-purple-400',
      iconClass: 'text-purple-500',
      unit: 'h'
    }
  } as const

  function metricValue(key: MetricKey): number | null {
    if (key === 'totalWorkouts') return props.totalWorkouts
    if (key === 'analyzedWorkouts') return props.analyzedWorkouts
    if (key === 'avgScore') return props.avgScore
    return props.totalHours
  }

  function metricValueLabel(key: MetricKey): string {
    const value = metricValue(key)
    if (value === null) return '-'
    if (key === 'avgScore') return Number.isInteger(value) ? String(value) : value.toFixed(1)
    return String(Math.round(value))
  }

  function metricTrend(key: MetricKey) {
    const current = metricValue(key)
    const previous = props.trends?.[key]?.previous
    if (current === null || typeof previous !== 'number' || previous <= 0) return null
    return calculateTrend(current, previous, props.trends?.[key]?.type || 'higher-is-better', 1)
  }

  function trendLabel(key: MetricKey): string {
    const trend = metricTrend(key)
    if (!trend) return 'No baseline'
    const sign = trend.percent > 0 ? '+' : ''
    return `${sign}${Math.round(trend.percent)}% vs prev`
  }
</script>
