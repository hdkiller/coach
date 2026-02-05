<template>
  <div class="flex items-center gap-1.5" :class="compact ? 'text-xs' : 'text-sm'">
    <div
      class="flex items-center justify-center rounded-full flex-shrink-0"
      :class="[trend.color, compact ? 'w-4 h-4 bg-opacity-10' : 'w-5 h-5 bg-opacity-10']"
    >
      <UIcon :name="trend.icon" :class="compact ? 'w-3 h-3' : 'w-4 h-4'" />
    </div>

    <div v-if="!iconOnly" class="flex flex-col leading-none">
      <span v-if="!valueOnly" class="font-bold whitespace-nowrap" :class="trend.color">
        {{ label || trend.label }}
      </span>
      <span v-if="showValue || valueOnly" class="font-bold mt-0.5" :class="trend.color">
        {{ trend.direction === 'up' ? '+' : '' }}{{ Math.round(trend.percent) }}%
      </span>
    </div>
    <span
      v-else-if="showValue"
      class="font-bold whitespace-nowrap"
      :class="[trend.color, compact ? 'text-[9px]' : 'text-xs']"
    >
      {{ trend.direction === 'up' ? '+' : '' }}{{ Math.round(trend.percent) }}%
    </span>
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
    valueOnly?: boolean
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
