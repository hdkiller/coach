<template>
  <div
    class="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden relative group transition-all duration-300"
    :class="[
      canClick
        ? 'hover:border-primary-300 dark:hover:border-primary-700 cursor-pointer shadow-md'
        : ''
    ]"
    @click="handleClick"
  >
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <UIcon v-if="icon" :name="icon" class="w-5 h-5" :class="iconColorClass" />
        <span class="text-[10px] font-black uppercase text-gray-500 tracking-widest">{{
          title
        }}</span>
      </div>
      <span
        v-if="score"
        class="text-[10px] font-black uppercase tracking-widest"
        :class="scoreColorClass"
      >
        {{ scoreLabel }}
      </span>
    </div>

    <div class="flex items-baseline gap-1 mb-2">
      <span class="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{{
        displayScore
      }}</span>
      <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">/ 10</span>
    </div>

    <!-- Progress Bar -->
    <div class="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
      <div
        class="h-full transition-all duration-1000 ease-out rounded-full"
        :class="progressBarClass"
        :style="{ width: `${Math.min((score || 0) * 10, 100)}%` }"
      />
    </div>

    <!-- Hover indicator (if clickable) -->
    <div
      v-if="canClick"
      class="absolute bottom-0 left-0 h-0.5 bg-primary-500 w-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
    />
  </div>
</template>

<script setup lang="ts">
  const props = defineProps<{
    title: string
    score?: number | null
    explanation?: string | null
    icon?: string
    color?: 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'cyan'
    compact?: boolean
  }>()

  const emit = defineEmits<{
    click: [
      data: {
        title: string
        score?: number | null
        explanation?: string | null
        color?: 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'cyan'
      }
    ]
  }>()

  // Determine if the card is clickable
  const canClick = computed(() => {
    return props.score !== null && props.score !== undefined && props.explanation
  })

  const handleClick = () => {
    // Only emit if there's a score AND an explanation
    if (props.score !== null && props.score !== undefined && props.explanation) {
      emit('click', {
        title: props.title,
        score: props.score,
        explanation: props.explanation,
        color: props.color
      })
    }
  }

  const displayScore = computed(() => {
    if (props.score === null || props.score === undefined) return '--'
    return Number.isInteger(props.score) ? props.score.toString() : props.score.toFixed(1)
  })

  const scoreColorClass = computed(() => {
    if (!props.score) return 'text-gray-400'
    if (props.score >= 9) return 'text-green-600 dark:text-green-400'
    if (props.score >= 7) return 'text-blue-600 dark:text-blue-400'
    if (props.score >= 5) return 'text-yellow-600 dark:text-yellow-400'
    if (props.score >= 3) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
  })

  const progressBarClass = computed(() => {
    if (!props.score) return 'bg-gray-400'
    if (props.score >= 9) return 'bg-green-500'
    if (props.score >= 7) return 'bg-blue-500'
    if (props.score >= 5) return 'bg-yellow-500'
    if (props.score >= 3) return 'bg-orange-500'
    return 'bg-red-500'
  })

  const iconColorClass = computed(() => {
    // Map prop colors to semantic tailwind text colors
    // Could be improved by using standard semantic names (success/warning/etc)
    const map: Record<string, string> = {
      gray: 'text-gray-500',
      red: 'text-red-500',
      orange: 'text-orange-500',
      yellow: 'text-yellow-500',
      green: 'text-green-500',
      blue: 'text-blue-500',
      purple: 'text-purple-500',
      cyan: 'text-cyan-500'
    }
    return map[props.color || 'gray'] || 'text-gray-500'
  })

  const scoreLabel = computed(() => {
    if (!props.score) return 'No data'
    if (props.score >= 9) return 'Exceptional'
    if (props.score >= 7) return 'Strong'
    if (props.score >= 5) return 'Adequate'
    if (props.score >= 3) return 'Needs Work'
    return 'Poor'
  })
</script>
