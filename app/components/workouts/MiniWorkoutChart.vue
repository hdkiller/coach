<template>
  <div class="mini-chart-container h-8 w-24 relative flex items-end gap-px">
    <UTooltip
      v-for="(step, index) in steps"
      :key="index"
      :text="`${step.name}: ${formatDuration(step.durationSeconds || step.duration || 0)}`"
      :popper="{ placement: 'top' }"
      :style="{ width: getStepWidth(step) + '%' }"
      class="h-full flex items-end"
    >
      <div class="rounded-xs w-full" :style="getStepStyle(step)" />
    </UTooltip>
  </div>
</template>

<script setup lang="ts">
  const props = defineProps<{
    workout: any // structuredWorkout JSON
    preference?: 'hr' | 'power'
  }>()

  const steps = computed(() => {
    if (!props.workout?.steps || props.workout.steps.length === 0) return []
    return props.workout.steps
  })

  const totalDuration = computed(() => {
    return steps.value.reduce(
      (sum: number, step: any) => sum + (step.durationSeconds || step.duration || 0),
      0
    )
  })

  function getStepWidth(step: any) {
    return ((step.durationSeconds || step.duration || 0) / totalDuration.value) * 100
  }

  function getStepStyle(step: any) {
    const color = getStepColor(step.type)
    const maxScale = 1.2 // 120% is top of chart

    // Intensity range (ramp) support
    // If preference is specified, try that first
    let range = null
    if (props.preference === 'hr') {
      range = step.heartRate?.range || step.power?.range
    } else {
      range = step.power?.range || step.heartRate?.range
    }

    if (range) {
      const startH = Math.max(Math.min(range.start / maxScale, 1) * 100, 10)
      const endH = Math.max(Math.min(range.end / maxScale, 1) * 100, 10)

      return {
        height: '100%',
        width: '100%',
        backgroundColor: color,
        clipPath: `polygon(0% ${100 - startH}%, 100% ${100 - endH}%, 100% 100%, 0% 100%)`
      }
    }

    // Flat intensity support
    let value = 0
    if (props.preference === 'hr') {
      value = step.heartRate?.value || step.power?.value || 0
    } else {
      value = step.power?.value || step.heartRate?.value || 0
    }

    const height = Math.min((value * 100) / maxScale, 100)
    return {
      height: `${Math.max(height, 10)}%`, // Minimum height for visibility
      width: '100%',
      backgroundColor: color
    }
  }

  function getStepColor(type: string): string {
    const colors: Record<string, string> = {
      Warmup: '#10b981', // green
      Active: '#f59e0b', // amber
      Rest: '#6366f1', // indigo
      Cooldown: '#06b6d4' // cyan
    }
    return colors[type] || '#9ca3af' // gray default
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    return `${mins}m`
  }
</script>
