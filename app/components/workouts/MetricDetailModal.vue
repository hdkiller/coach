<template>
  <UModal
    v-model:open="isOpen"
    :title="metricInfo?.label || 'Metric Detail'"
    :ui="{ width: 'sm:max-w-2xl' }"
  >
    <template #body>
      <div v-if="metricInfo" class="space-y-6">
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
            class="h-[200px] w-full bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4"
          >
            <ClientOnly>
              <BaseStreamChart
                :label="metricInfo.label"
                :data-points="streamData"
                :labels="timeData"
                :color="chartColor"
                :y-axis-label="unit"
              />
            </ClientOnly>
          </div>
          <p class="text-[9px] text-gray-400 font-bold uppercase tracking-widest text-center">
            Detailed distribution of this metric across the entire session duration
          </p>
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

  const metricInfo = computed(() => metricDefinitions[props.metricKey])

  const streamKey = computed(() => {
    const key = props.metricKey.toLowerCase()
    if (key.includes('hr')) return 'heartrate'
    if (key.includes('power') || key === 'np' || key === 'tss' || key.includes('load'))
      return 'watts'
    if (key.includes('pace') || key.includes('consistency') || key.includes('velocity'))
      return 'velocity'
    return null
  })

  const hasStreamData = computed(() => !!streamKey.value)

  const streamData = computed(() => {
    if (!streamKey.value || !props.streams) return []
    return props.streams[streamKey.value] || []
  })

  const timeData = computed(() => {
    if (!props.streams?.time) return []
    return props.streams.time
  })

  const chartColor = computed(() => {
    if (streamKey.value === 'heartrate') return '#ef4444' // pink/red
    if (streamKey.value === 'watts') return '#8b5cf6' // purple
    if (streamKey.value === 'velocity') return '#3b82f6' // blue
    return '#3b82f6'
  })
</script>
