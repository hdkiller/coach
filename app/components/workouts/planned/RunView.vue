<template>
  <div
    class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 sm:p-6"
  >
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold">Run Details</h3>
      <div class="flex gap-2">
        <UButton
          size="sm"
          color="neutral"
          variant="ghost"
          icon="i-heroicons-eye"
          @click="$emit('view')"
        >
          View
        </UButton>
        <UButton
          size="sm"
          color="neutral"
          variant="ghost"
          icon="i-heroicons-adjustments-horizontal"
          @click="$emit('adjust')"
        >
          Adjust
        </UButton>
        <UButton
          size="sm"
          color="neutral"
          variant="ghost"
          icon="i-heroicons-arrow-path"
          :loading="generating"
          @click="$emit('regenerate')"
        >
          Regenerate
        </UButton>
      </div>
    </div>

    <!-- Summary Stats -->
    <div v-if="hasStructure" class="grid grid-cols-2 gap-4 mb-6">
      <div class="p-3 bg-gray-50 dark:bg-gray-950 rounded-lg">
        <div class="text-xs text-muted mb-1">Total Distance (Est.)</div>
        <div class="text-xl font-bold">{{ (totalDistance / 1000).toFixed(1) }} km</div>
      </div>
      <div class="p-3 bg-gray-50 dark:bg-gray-950 rounded-lg">
        <div class="text-xs text-muted mb-1">Avg Intensity</div>
        <div class="text-xl font-bold">{{ Math.round(avgIntensity * 100) }}%</div>
      </div>
    </div>

    <!-- Structure Chart -->
    <div v-if="hasStructure" class="mb-6">
      <h4 class="text-sm font-semibold text-muted mb-3">Structure Profile</h4>
      <WorkoutRunChart
        :workout="workout.structuredWorkout"
        :sport-settings="sportSettings"
        :preference="chartPreference"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import WorkoutRunChart from '~/components/workouts/WorkoutRunChart.vue'
  import { getPreferredMetric } from '~/utils/sportSettings'

  const props = defineProps<{
    workout: any
    sportSettings?: any
    generating?: boolean
  }>()

  defineEmits(['view', 'adjust', 'regenerate'])

  const hasStructure = computed(() => !!props.workout.structuredWorkout?.steps?.length)

  function collectMetricAvailability(steps: any[]): {
    hasHr: boolean
    hasPower: boolean
    hasPace: boolean
  } {
    let hasHr = false
    let hasPower = false
    let hasPace = false

    const visit = (nodes: any[]) => {
      nodes.forEach((step: any) => {
        if (step?.heartRate) hasHr = true
        if (step?.power) hasPower = true
        if (step?.pace) hasPace = true

        if (Array.isArray(step?.steps) && step.steps.length > 0) {
          visit(step.steps)
        }
      })
    }

    visit(Array.isArray(steps) ? steps : [])
    return { hasHr, hasPower, hasPace }
  }

  const chartPreference = computed<'hr' | 'power' | 'pace'>(() => {
    const steps = props.workout.structuredWorkout?.steps || []
    const availability = collectMetricAvailability(steps)
    return getPreferredMetric(props.sportSettings, availability)
  })

  function getTargetMidpoint(target: any): number | null {
    if (!target) return null
    if (typeof target.value === 'number') return target.value
    if (
      target.range &&
      typeof target.range.start === 'number' &&
      typeof target.range.end === 'number'
    ) {
      return (target.range.start + target.range.end) / 2
    }
    return null
  }

  function parsePaceToMps(value: number, units?: string): number | null {
    if (!Number.isFinite(value) || value <= 0) return null
    const normalizedUnits = String(units || '')
      .trim()
      .toLowerCase()

    if (normalizedUnits.includes('/km')) {
      const secondsPerKm = value * 60
      return secondsPerKm > 0 ? 1000 / secondsPerKm : null
    }

    if (normalizedUnits === 'm/s') return value

    // If no explicit unit and value is already in realistic speed range, treat as m/s
    if (value > 2.5 && value < 8) return value

    return null
  }

  function clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n))
  }

  function estimateStepSpeedMps(step: any): number {
    const thresholdPace = Number(props.sportSettings?.thresholdPace || 0)
    const lthr = Number(props.sportSettings?.lthr || 0)
    const ftp = Number(props.sportSettings?.ftp || 0)

    const paceMid = getTargetMidpoint(step.pace)
    if (paceMid !== null) {
      const explicitMps = parsePaceToMps(paceMid, step.pace?.units)
      if (explicitMps) return explicitMps
      if (thresholdPace > 0) {
        const factor = paceMid > 3 ? paceMid / thresholdPace : paceMid
        return clamp(factor, 0.5, 1.5) * thresholdPace
      }
    }

    const hrMid = getTargetMidpoint(step.heartRate)
    if (hrMid !== null && thresholdPace > 0) {
      const units = String(step.heartRate?.units || '')
        .trim()
        .toLowerCase()
      let factor = hrMid
      if (units === 'bpm' && lthr > 0) factor = hrMid / lthr
      else if (hrMid > 2) factor = hrMid / 100
      return clamp(factor, 0.5, 1.3) * thresholdPace
    }

    const powerMid = getTargetMidpoint(step.power)
    if (powerMid !== null && thresholdPace > 0) {
      const units = String(step.power?.units || '')
        .trim()
        .toLowerCase()
      let factor = powerMid
      if ((units === 'w' || units === 'watts') && ftp > 0) factor = powerMid / ftp
      else if (powerMid > 3) factor = powerMid / 100
      return clamp(factor, 0.5, 1.4) * thresholdPace
    }

    // Generic fallback (~6:10 min/km)
    return 2.7
  }

  const totalDistance = computed(() => {
    if (!props.workout.structuredWorkout?.steps) return 0

    const calculateRecursiveDistance = (steps: any[]): number => {
      return steps.reduce((sum: number, step: any) => {
        const reps = Number(step.reps ?? step.repeat ?? step.intervals) || 1
        let stepDist = 0

        if (step.steps && Array.isArray(step.steps) && step.steps.length > 0) {
          stepDist = calculateRecursiveDistance(step.steps)
        } else {
          const explicitDistance = Number(step.distance) || 0
          if (explicitDistance > 0) {
            stepDist = explicitDistance
          } else {
            const durationSec = Number(step.durationSeconds || step.duration || 0)
            if (durationSec > 0) {
              const speedMps = estimateStepSpeedMps(step)
              stepDist = Math.max(0, Math.round(durationSec * speedMps))
            } else {
              stepDist = 0
            }
          }
        }

        return sum + stepDist * reps
      }, 0)
    }

    return calculateRecursiveDistance(props.workout.structuredWorkout.steps)
  })

  const avgIntensity = computed(() => {
    const steps = props.workout.structuredWorkout?.steps
    if (!steps?.length) return 0

    const normalizeHrIntensity = (heartRate: any) => {
      if (!heartRate) return null
      const units = String(heartRate?.units || '')
        .trim()
        .toLowerCase()
      if (units === 'hr_zone' || units === 'zone') {
        const zone = Number(heartRate?.value)
        if (Number.isFinite(zone) && zone > 0) {
          return Math.max(0.45, Math.min(1.25, 0.45 + zone * 0.1))
        }
      }
      if (typeof heartRate?.value === 'number') {
        const value = Number(heartRate.value)
        return value > 2 ? value / 100 : value
      }
      return null
    }

    let totalWeighted = 0
    let totalDuration = 0

    steps.forEach((step: any) => {
      const duration = step.durationSeconds || step.duration || 60
      const intensity =
        normalizeHrIntensity(step.heartRate) ||
        (typeof step.power?.value === 'number'
          ? step.power.value > 3
            ? step.power.value / 100
            : step.power.value
          : null) ||
        (step.type === 'Rest' ? 0.5 : 0.75)
      totalWeighted += intensity * duration
      totalDuration += duration
    })

    return totalDuration > 0 ? totalWeighted / totalDuration : 0
  })
</script>
