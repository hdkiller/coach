<template>
  <div class="flex items-center gap-1.5" :class="compact ? 'text-xs' : 'text-sm'">
    <div
      class="flex items-center justify-center rounded-full"
      :class="[trend.color, compact ? 'w-4 h-4 bg-opacity-10' : 'w-5 h-5 bg-opacity-10']"
    >
      <UIcon :name="trend.icon" :class="compact ? 'w-3 h-3' : 'w-4 h-4'" />
    </div>

    <div v-if="!iconOnly" class="flex flex-col leading-none">
      <span class="font-bold" :class="trend.color">
        {{ label || trend.label }}
      </span>
      <span v-if="showValue" class="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
        {{ trend.direction === 'up' ? '+' : '' }}{{ Math.round(trend.percent) }}%
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { TrendType } from '~/composables/useTrend'

  const props = defineProps<{
    current: number
    previous: number | number[]
    type?: TrendType
    label?: string
    compact?: boolean
    iconOnly?: boolean
    showValue?: boolean
    threshold?: number
  }>()

  const { calculateTrend } = useTrend()

  const trend = computed(() => {
    return calculateTrend(
      props.current,
      props.previous,
      props.type || 'higher-is-better',
      props.threshold || 1
    )
  })
</script>
