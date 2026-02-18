<template>
  <div class="mini-chart-container h-8 w-24 relative">
    <div class="absolute inset-0 flex items-end gap-px">
      <UTooltip
        v-for="(step, index) in steps"
        :key="index"
        :text="tooltipText(step)"
        :popper="{ placement: 'top' }"
        :style="{ width: getStepWidth(step) + '%' }"
        class="h-full flex items-end"
      >
        <div class="rounded-xs w-full" :style="getStepStyle(step)" />
      </UTooltip>
    </div>

    <svg
      v-if="showCadenceLine"
      class="absolute inset-0 pointer-events-none z-10"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <path
        :d="cadencePaths.merged"
        fill="none"
        stroke="#93c5fd"
        stroke-width="1.5"
        stroke-dasharray="3,2"
        class="opacity-90"
      />
      <path
        :d="cadencePaths.explicit"
        fill="none"
        stroke="white"
        stroke-width="1.5"
        class="opacity-85"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
  const props = withDefaults(
    defineProps<{
      workout: any // structuredWorkout JSON
      preference?: 'hr' | 'power' | 'pace'
      showCadence?: boolean
    }>(),
    {
      preference: 'power',
      showCadence: false
    }
  )

  const normalizedWorkout = computed(() => {
    const workout = props.workout
    if (!workout) return null
    if (typeof workout === 'string') {
      try {
        return JSON.parse(workout)
      } catch {
        return null
      }
    }
    return workout
  })

  const steps = computed(() => {
    const rawSteps = normalizedWorkout.value?.steps
    if (!Array.isArray(rawSteps) || rawSteps.length === 0) return []
    return flattenWorkoutSteps(rawSteps)
  })

  function flattenWorkoutSteps(steps: any[], depth = 0): any[] {
    if (!Array.isArray(steps)) return []

    const flattened: any[] = []

    steps.forEach((step: any) => {
      const children = Array.isArray(step.steps) ? step.steps : []
      const hasChildren = children.length > 0

      if (hasChildren) {
        const repsRaw = Number(step.reps ?? step.repeat ?? step.intervals)
        const reps = repsRaw > 1 ? repsRaw : 1
        for (let i = 0; i < reps; i++) {
          flattened.push(...flattenWorkoutSteps(children, depth + 1))
        }
        return
      }

      flattened.push({
        ...step,
        _depth: depth
      })
    })

    return flattened
  }

  const totalDuration = computed(() => {
    return steps.value.reduce((sum: number, step: any) => sum + getStepDuration(step), 0)
  })

  const showCadenceLine = computed(() => {
    if (!props.showCadence) return false
    return steps.value.some((step: any) => Number(step?.cadence) > 0)
  })

  const cadencePaths = computed(() => {
    if (!showCadenceLine.value || totalDuration.value <= 0 || steps.value.length === 0) {
      return { merged: '', explicit: '' }
    }

    let mergedPath = ''
    let explicitPath = ''
    let currentTime = 0

    steps.value.forEach((step: any) => {
      const stepDuration = Number(step.durationSeconds || step.duration || 0)
      if (stepDuration <= 0) return

      const cadenceMeta = getStepCadenceMeta(step)
      const startX = (currentTime / totalDuration.value) * 100
      const endX = ((currentTime + stepDuration) / totalDuration.value) * 100

      const clampedCadence = Math.max(0, Math.min(cadenceMeta.value, 120))
      const y = 100 - (clampedCadence / 120) * 100

      if (mergedPath === '') {
        mergedPath = `M ${startX} ${y} L ${endX} ${y}`
      } else {
        mergedPath += ` L ${startX} ${y} L ${endX} ${y}`
      }

      if (!cadenceMeta.inferred) {
        if (explicitPath === '') {
          explicitPath = `M ${startX} ${y} L ${endX} ${y}`
        } else {
          explicitPath += ` L ${startX} ${y} L ${endX} ${y}`
        }
      }

      currentTime += stepDuration
    })

    return { merged: mergedPath, explicit: explicitPath }
  })

  function getStepWidth(step: any) {
    const duration = getStepDuration(step)
    if (totalDuration.value > 0) return (duration / totalDuration.value) * 100
    if (steps.value.length > 0) return 100 / steps.value.length
    return 0
  }

  function getStepStyle(step: any) {
    const color = getStepColor(step.type)
    const maxScale = 1.2 // 120% is top of chart

    // Intensity range (ramp) support
    let range = null
    if (props.preference === 'hr') {
      range = step.heartRate?.range || step.pace?.range || step.power?.range
    } else if (props.preference === 'pace') {
      range = step.pace?.range || step.heartRate?.range || step.power?.range
    } else {
      range = step.power?.range || step.pace?.range || step.heartRate?.range
    }

    const isRamp =
      step.ramp === true || (range && step.ramp === undefined && props.preference === 'power')

    if (range && isRamp) {
      const startH = Math.max(Math.min(range.start / maxScale, 1) * 100, 10)
      const endH = Math.max(Math.min(range.end / maxScale, 1) * 100, 10)

      return {
        height: '100%',
        width: '100%',
        backgroundColor: color,
        clipPath: `polygon(0% ${100 - startH}%, 100% ${100 - endH}%, 100% 100%, 0% 100%)`
      }
    }

    // Steady range (block at midpoint)
    if (range && !isRamp) {
      const val = (range.start + range.end) / 2
      const height = Math.min((val * 100) / maxScale, 100)
      return {
        height: `${Math.max(height, 10)}%`,
        width: '100%',
        backgroundColor: color
      }
    }

    // Flat intensity support
    let value = 0
    if (props.preference === 'hr') {
      value = step.heartRate?.value || step.pace?.value || step.power?.value || 0
    } else if (props.preference === 'pace') {
      value = step.pace?.value || step.heartRate?.value || step.power?.value || 0
    } else {
      value = step.power?.value || step.pace?.value || step.heartRate?.value || 0
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

  function tooltipText(step: any): string {
    const base = `${step.name}: ${formatDuration(getStepDuration(step))}`
    const cadenceMeta = getStepCadenceMeta(step)
    if (cadenceMeta.value > 0) {
      return cadenceMeta.inferred
        ? `${base} @ ${Math.round(cadenceMeta.value)} rpm (inferred)`
        : `${base} @ ${Math.round(cadenceMeta.value)} rpm`
    }
    return base
  }

  function getStepCadenceMeta(step: any): { value: number; inferred: boolean } {
    const cadenceRangeStart = Number(step?.cadenceRange?.start)
    const cadenceRangeEnd = Number(step?.cadenceRange?.end)
    if (
      Number.isFinite(cadenceRangeStart) &&
      cadenceRangeStart > 0 &&
      Number.isFinite(cadenceRangeEnd) &&
      cadenceRangeEnd > 0
    ) {
      return { value: (cadenceRangeStart + cadenceRangeEnd) / 2, inferred: false }
    }

    const cadenceObjectValue = Number(step?.cadence?.value)
    if (Number.isFinite(cadenceObjectValue) && cadenceObjectValue > 0) {
      return { value: cadenceObjectValue, inferred: false }
    }

    const cadenceObjectStart = Number(step?.cadence?.start)
    const cadenceObjectEnd = Number(step?.cadence?.end)
    if (
      Number.isFinite(cadenceObjectStart) &&
      cadenceObjectStart > 0 &&
      Number.isFinite(cadenceObjectEnd) &&
      cadenceObjectEnd > 0
    ) {
      return { value: (cadenceObjectStart + cadenceObjectEnd) / 2, inferred: false }
    }

    const explicit = Number(step?.cadence)
    if (Number.isFinite(explicit) && explicit > 0) {
      return { value: explicit, inferred: false }
    }

    const intensity = getStepIntensity(step)
    if (step?.type === 'Rest') return { value: 85, inferred: true }
    if (step?.type === 'Cooldown') return { value: 85, inferred: true }
    if (step?.type === 'Warmup') return { value: 88, inferred: true }
    if (intensity >= 0.95) return { value: 90, inferred: true }
    if (intensity >= 0.8) return { value: 88, inferred: true }
    if (intensity >= 0.65) return { value: 90, inferred: true }
    return { value: 85, inferred: true }
  }

  function getStepIntensity(step: any): number {
    const power = normalizeTarget(step?.power)
    const hr = normalizeTarget(step?.heartRate)
    const pace = normalizeTarget(step?.pace)

    const powerValue = getTargetValue(power)
    if (powerValue !== undefined) return powerValue

    const hrValue = getTargetValue(hr)
    if (hrValue !== undefined) return hrValue

    const paceValue = getTargetValue(pace)
    if (paceValue !== undefined) return paceValue

    if (step?.type === 'Rest') return 0.55
    return 0.75
  }

  function getTargetValue(
    target: { value?: number; range?: { start: number; end: number } } | null
  ) {
    if (!target) return undefined
    if (typeof target.value === 'number') return target.value
    if (target.range) return (target.range.start + target.range.end) / 2
    return undefined
  }

  function normalizeTarget(
    target: any
  ): { value?: number; range?: { start: number; end: number }; ramp?: boolean } | null {
    if (target === null || target === undefined) return null

    if (typeof target === 'number') {
      return { value: target }
    }

    if (typeof target === 'object') {
      if (target.range && typeof target.range === 'object') {
        return {
          range: {
            start: Number(target.range.start) || 0,
            end: Number(target.range.end) || 0
          },
          ramp: target.ramp
        }
      }
      if (target.value !== undefined) {
        return { value: Number(target.value) || 0 }
      }
    }

    return null
  }

  function getStepDuration(step: any): number {
    const duration = Number(step?.durationSeconds ?? step?.duration ?? 0)
    return Number.isFinite(duration) && duration > 0 ? duration : 0
  }
</script>
