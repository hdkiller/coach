<template>
  <div class="workout-chart-container">
    <div
      v-if="!workout || !workout.steps || workout.steps.length === 0"
      class="text-center py-8 text-muted text-sm"
    >
      No structured workout data available.
    </div>

    <div v-else class="space-y-4">
      <!-- Legend -->
      <div class="flex items-center gap-4 text-xs">
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 rounded-xs bg-blue-500" />
          <span class="text-muted">Intensity (% {{ preference === 'hr' ? 'LTHR' : 'FTP' }})</span>
        </div>
      </div>

      <!-- Chart -->
      <div
        class="relative bg-gray-50 dark:bg-gray-950 rounded-lg p-4 border border-gray-200 dark:border-gray-800"
      >
        <!-- Y-axis labels -->
        <div class="flex">
          <div
            class="flex flex-col justify-between text-xs text-muted w-8 sm:w-12 pr-1 sm:pr-2 text-right h-[140px] sm:h-[200px]"
          >
            <span v-for="(label, i) in yAxisLabels" :key="i">{{ label }}%</span>
          </div>

          <!-- Chart area -->
          <div class="flex-1 relative min-w-0 h-[140px] sm:h-[200px]">
            <!-- Grid lines -->
            <div class="absolute inset-0 flex flex-col justify-between">
              <div v-for="i in 6" :key="i" class="border-t border-gray-200 dark:border-gray-700" />
            </div>

            <!-- Intensity bars -->
            <div class="absolute inset-0 flex items-end gap-0.5">
              <UTooltip
                v-for="(step, index) in normalizedSteps"
                :key="index"
                :popper="{ placement: 'top' }"
                :style="getStepContainerStyle(step)"
                class="relative group flex items-end"
              >
                <template #text>
                  <div class="font-semibold">{{ step.name }}</div>
                  <div class="text-[10px] opacity-80 mt-1">
                    {{ formatDuration(step.durationSeconds || step.duration || 0) }} @
                    {{ getStepIntensityLabel(step) }}
                    <span v-if="!step.heartRate && !step.power && !step.pace"> (Inferred)</span>
                  </div>
                </template>
                <!-- Wrapper to force stacking context -->
                <div class="relative w-full h-full flex items-end">
                  <!-- Range Shade -->
                  <div
                    v-if="getStepRange(step)"
                    :style="getStepRangeStyle(step)"
                    class="absolute left-0 w-full pointer-events-none border-y border-current/40"
                  />
                  <!-- Primary Target Bar -->
                  <div
                    :style="getStepBarStyle(step)"
                    class="w-full h-full transition-all group-hover:opacity-80"
                  />
                </div>
              </UTooltip>
            </div>
          </div>
        </div>

        <!-- X-axis (time) -->
        <div class="flex mt-2 ml-8 sm:ml-12">
          <div class="flex-1 flex justify-between text-xs text-muted">
            <span>0</span>
            <span>{{ formatDuration(totalDuration / 4) }}</span>
            <span>{{ formatDuration(totalDuration / 2) }}</span>
            <span>{{ formatDuration((totalDuration * 3) / 4) }}</span>
            <span>{{ formatDuration(totalDuration) }}</span>
          </div>
        </div>
      </div>

      <!-- Step breakdown -->
      <div class="space-y-2">
        <h4 class="text-sm font-semibold text-muted">Workout Steps</h4>
        <div class="space-y-1">
          <div
            v-for="(step, index) in normalizedSteps"
            :key="index"
            class="rounded hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors p-2"
          >
            <!-- Mobile View -->
            <div class="flex flex-col gap-1.5 sm:hidden">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <div
                    class="w-3 h-3 rounded-full flex-shrink-0"
                    :style="{ backgroundColor: getStepColor(getStepIntensity(step)) }"
                  />
                  <span class="text-sm font-medium truncate">{{ step.name }}</span>
                </div>
                <div class="text-xs font-mono text-muted flex-shrink-0">
                  {{ formatDuration(step.durationSeconds || step.duration || 0) }}
                </div>
              </div>

              <div class="flex items-center justify-between text-xs pl-5">
                <div class="text-muted">{{ step.type }}</div>

                <div class="flex items-center text-right">
                  <!-- Zone -->
                  <div
                    class="w-8 text-center font-semibold text-gray-700 dark:text-gray-300 flex-shrink-0"
                  >
                    {{ getZoneName(getStepIntensity(step)) }}
                  </div>

                  <!-- Cadence -->
                  <div class="w-16 text-blue-500 flex-shrink-0">
                    <span v-if="step.cadence">{{ step.cadence }} spm</span>
                    <span v-else class="opacity-0">-</span>
                  </div>

                  <!-- Intensity % -->
                  <div class="w-24 font-bold flex-shrink-0">
                    {{ getStepIntensityLabel(step) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Desktop View -->
            <!-- Desktop View -->
            <div class="hidden sm:grid grid-cols-[12px_1fr_54px_80px_140px] items-center gap-4">
              <div
                class="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                :style="{ backgroundColor: getStepColor(getStepIntensity(step)) }"
              />
              <div class="min-w-0">
                <div class="text-sm font-medium truncate">{{ step.name }}</div>
                <div class="text-xs text-muted">{{ step.type }}</div>
              </div>
              <div class="text-center text-sm font-bold text-gray-500 dark:text-gray-400">
                {{ getZoneName(getStepIntensity(step)) }}
              </div>
              <div class="text-sm text-blue-500 font-semibold text-center whitespace-nowrap">
                <!-- Placeholder for pace or cadence if available -->
                <span v-if="step.cadence">{{ step.cadence }} SPM</span>
                <span v-else class="text-gray-300 dark:text-gray-700">-</span>
              </div>
              <div class="text-right">
                <div class="text-sm font-bold whitespace-nowrap">
                  {{ getStepIntensityLabel(step) }}
                </div>
                <div class="text-[10px] text-muted">
                  {{ formatDuration(step.durationSeconds || step.duration || 0) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Zone Distribution -->
      <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
        <h4 class="text-sm font-semibold text-muted mb-3">Time in Zone</h4>

        <!-- Stacked Horizontal Bar -->
        <div
          class="h-6 w-full rounded-md overflow-hidden flex relative bg-gray-100 dark:bg-gray-700 mb-3"
        >
          <UTooltip
            v-for="(zone, index) in zoneDistribution"
            :key="index"
            :text="getZoneSegmentTooltip(zone)"
            :popper="{ placement: 'top' }"
            class="h-full relative group transition-all hover:opacity-90"
            :style="{
              width: `${(zone.duration / totalDuration) * 100}%`,
              backgroundColor: zone.color
            }"
          >
            <div class="w-full h-full" />
          </UTooltip>
        </div>

        <!-- Legend -->
        <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
          <div
            v-for="zone in zoneDistribution"
            :key="zone.name"
            class="flex flex-col p-1.5 bg-gray-50 dark:bg-gray-950 rounded border border-gray-100 dark:border-gray-800"
          >
            <div class="flex items-center gap-1.5 mb-1">
              <div
                class="w-2 h-2 rounded-full flex-shrink-0"
                :style="{ backgroundColor: zone.color }"
              />
              <span class="font-medium text-gray-500">{{ zone.name }}</span>
            </div>
            <span class="font-bold pl-3.5">{{ formatDuration(zone.duration) }}</span>
            <span class="text-[10px] text-muted pl-3.5"
              >{{ Math.round((zone.duration / totalDuration) * 100) }}%</span
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ZONE_COLORS } from '~/utils/zone-colors'

  const props = withDefaults(
    defineProps<{
      workout: any // structuredWorkout JSON
      preference?: 'hr' | 'power' | 'pace'
      sportSettings?: any
    }>(),
    {
      preference: 'hr',
      sportSettings: undefined
    }
  )

  // Computed properties
  const normalizedSteps = computed(() => flattenWorkoutSteps(props.workout?.steps || []))

  const totalDuration = computed(() => {
    return normalizedSteps.value.reduce(
      (sum: number, step: any) => sum + (step.durationSeconds || step.duration || 0),
      0
    )
  })

  const chartMaxPower = computed(() => {
    let maxTarget = 0
    normalizedSteps.value.forEach((step: any) => {
      let target: any
      if (props.preference === 'hr') target = step.heartRate
      else if (props.preference === 'power') target = step.power
      else if (props.preference === 'pace') target = step.pace

      const normalizedTarget = normalizeMetricTarget(target, props.preference)
      if (normalizedTarget) {
        if (normalizedTarget.value !== undefined) {
          maxTarget = Math.max(maxTarget, normalizedTarget.value)
        } else if (normalizedTarget.range) {
          maxTarget = Math.max(maxTarget, normalizedTarget.range.end)
        }
      }
    })
    // Ensure a minimum scale and add a buffer
    return Math.max(1.2, maxTarget * 1.1)
  })

  const yAxisLabels = computed(() => {
    const labels = []
    const step = chartMaxPower.value / 5
    for (let i = 5; i >= 0; i--) {
      labels.push(Math.round(i * step * 100))
    }
    return labels
  })

  const zoneDistribution = computed(() => {
    // Default zones if settings are missing
    let distribution = [
      { name: 'Z1', min: 0, max: 0.75, duration: 0, color: ZONE_COLORS[0] }, // Green
      { name: 'Z2', min: 0.75, max: 0.85, duration: 0, color: ZONE_COLORS[1] }, // Blue
      { name: 'Z3', min: 0.85, max: 0.95, duration: 0, color: ZONE_COLORS[2] }, // Amber
      { name: 'Z4', min: 0.95, max: 1.05, duration: 0, color: ZONE_COLORS[3] }, // Orange
      { name: 'Z5', min: 1.05, max: 9.99, duration: 0, color: ZONE_COLORS[4] } // Red
    ]

    // Use sport specific HR zones if available and preferred
    if (props.preference === 'hr' && props.sportSettings?.hrZones && props.sportSettings.lthr) {
      const lthr = props.sportSettings.lthr
      distribution = props.sportSettings.hrZones.map((z: any, i: number) => ({
        name: `Z${i + 1}`,
        longName: z.name || `Zone ${i + 1}`,
        min: z.min / lthr,
        max: z.max / lthr,
        duration: 0,
        color: ZONE_COLORS[i] || '#9ca3af'
      }))
    }

    if (!normalizedSteps.value.length) return distribution

    normalizedSteps.value.forEach((step: any) => {
      const intensity = getStepIntensity(step)
      const duration = step.durationSeconds || step.duration || 0

      // Find zone
      const zone =
        distribution.find((z) => intensity <= z.max) || distribution[distribution.length - 1]
      if (zone) zone.duration += duration
    })

    return distribution
  })

  // Functions
  function getZoneSegmentTooltip(zone: any) {
    const percent = Math.round((zone.duration / totalDuration.value) * 100)
    return `${zone.longName || zone.name}: ${formatDuration(zone.duration)} (${percent}%) (${props.preference === 'hr' ? 'HR' : 'Power'})`
  }

  function getHeartRateReference(): number {
    const lthr = Number(props.sportSettings?.lthr)
    if (Number.isFinite(lthr) && lthr > 0) return lthr

    const maxHr = Number(props.sportSettings?.maxHr)
    if (Number.isFinite(maxHr) && maxHr > 0) return maxHr

    return 200
  }

  function toNormalizedHeartRate(value: number): number {
    if (!Number.isFinite(value) || value <= 0) return 0
    if (value <= 3) return value
    return value / getHeartRateReference()
  }

  function normalizeMetricTarget(
    target: { value?: number; range?: { start: number; end: number } } | undefined,
    metric: 'hr' | 'power' | 'pace'
  ): { value?: number; range?: { start: number; end: number } } | undefined {
    if (!target) return undefined
    if (metric !== 'hr') return target

    if (target.range) {
      return {
        range: {
          start: toNormalizedHeartRate(target.range.start),
          end: toNormalizedHeartRate(target.range.end)
        }
      }
    }

    if (typeof target.value === 'number') {
      return { value: toNormalizedHeartRate(target.value) }
    }

    return target
  }

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
        _depth: depth,
        heartRate: normalizeTarget(step.heartRate) || step.heartRate,
        power: normalizeTarget(step.power) || step.power,
        pace: normalizeTarget(step.pace) || step.pace
      })
    })

    return flattened
  }

  function normalizeTarget(
    target: any
  ): { value?: number; range?: { start: number; end: number }; ramp?: boolean } | undefined {
    if (target === null || target === undefined) return undefined

    if (Array.isArray(target)) {
      if (target.length >= 2) {
        return { range: { start: Number(target[0]) || 0, end: Number(target[1]) || 0 } }
      }
      if (target.length === 1) {
        return { value: Number(target[0]) || 0 }
      }
      return undefined
    }

    if (typeof target === 'number') {
      return { value: target }
    }

    if (typeof target === 'object') {
      if (target.range && typeof target.range === 'object') {
        const start = target.range.start !== undefined ? target.range.start : target.range[0]
        const end = target.range.end !== undefined ? target.range.end : target.range[1]
        return {
          range: {
            start: Number(start) || 0,
            end: Number(end) || 0
          },
          ramp: target.ramp
        }
      }
      if (target.start !== undefined && target.end !== undefined) {
        return {
          range: {
            start: Number(target.start) || 0,
            end: Number(target.end) || 0
          },
          ramp: target.ramp
        }
      }
      if (target.value !== undefined) {
        return { value: Number(target.value) || 0 }
      }
    }

    return undefined
  }

  function getTargetValue(
    target: { value?: number; range?: { start: number; end: number } } | undefined
  ) {
    if (!target) return undefined
    if (typeof target.value === 'number') return target.value
    if (target.range) return (target.range.start + target.range.end) / 2
    return undefined
  }

  function getStepIntensityLabel(step: any): string {
    if (step.heartRate?.range) {
      const start = Number(step.heartRate.range.start)
      const end = Number(step.heartRate.range.end)
      if (start > 3 || end > 3) {
        return `${Math.round(start)}-${Math.round(end)} bpm`
      }
      return `${Math.round(start * 100)}-${Math.round(end * 100)}% LTHR`
    } else if (step.heartRate?.value) {
      const hr = Number(step.heartRate.value)
      if (hr > 3) return `${Math.round(hr)} bpm`
      return `${Math.round(hr * 100)}% LTHR`
    } else if (step.power?.range) {
      return `${Math.round(step.power.range.start * 100)}-${Math.round(step.power.range.end * 100)}% FTP`
    } else if (step.power?.value) {
      return `${Math.round(step.power.value * 100)}% FTP`
    } else if (step.pace?.range) {
      return `${Math.round(step.pace.range.start * 100)}-${Math.round(step.pace.range.end * 100)}% Pace`
    } else if (step.pace?.value) {
      return `${Math.round(step.pace.value * 100)}% Pace`
    }
    const preferenceUnit =
      props.preference === 'hr' ? 'LTHR' : props.preference === 'pace' ? 'Pace' : 'FTP'
    return `${Math.round(getInferredIntensity(step) * 100)}% ${preferenceUnit}`
  }

  function getStepIntensity(step: any): number {
    const hr = getTargetValue(normalizeMetricTarget(step.heartRate, 'hr'))
    const pwr = getTargetValue(step.power)
    const pace = getTargetValue(step.pace)

    if (props.preference === 'hr' && hr !== undefined) return hr
    if (props.preference === 'pace' && pace !== undefined) return pace
    if (props.preference === 'power' && pwr !== undefined) return pwr

    // Final fallbacks
    return pwr ?? hr ?? pace ?? getInferredIntensity(step)
  }

  function getInferredIntensity(step: any): number {
    if (step.type === 'Rest' || step.type === 'Warmup' || step.type === 'Cooldown') return 0.6
    return 0.8
  }

  function getStepContainerStyle(step: any) {
    const width = ((step.durationSeconds || step.duration || 0) / totalDuration.value) * 100
    return {
      width: `${width}%`,
      height: '100%',
      minWidth: '2px'
    }
  }

  function getStepRange(step: any) {
    if (props.preference === 'hr') return normalizeMetricTarget(step.heartRate, 'hr')?.range
    if (props.preference === 'pace') return step.pace?.range
    if (props.preference === 'power') return step.power?.range
    return (
      normalizeMetricTarget(step.heartRate, 'hr')?.range || step.power?.range || step.pace?.range
    )
  }

  function getStepRangeStyle(step: any) {
    const range = getStepRange(step)
    if (!range) return {}

    const maxScale = chartMaxPower.value
    const startH = (range.start / maxScale) * 100
    const endH = (range.end / maxScale) * 100

    // Ramp logic: Trapezoid from Start to End
    if (step.power?.ramp || step.heartRate?.ramp || step.pace?.ramp) {
      const startY = 100 - startH
      const endY = 100 - endH
      // Polygon: Top-Left (0% startY), Top-Right (100% endY), Bottom-Right (100% 100%), Bottom-Left (0% 100%)
      return {
        height: '100%',
        bottom: '0%',
        backgroundColor: getStepColor(getStepIntensity(step)),
        opacity: 0.8, // More opaque for ramps
        clipPath: `polygon(0% ${startY}%, 100% ${endY}%, 100% 100%, 0% 100%)`
      }
    }

    // Range logic: Stacked Window
    const height = Math.abs(endH - startH)
    const bottom = Math.min(startH, endH)

    return {
      height: `${height}%`,
      bottom: `${bottom}%`,
      backgroundColor: getStepColor(getStepIntensity(step)),
      opacity: 0.2 // Default opacity for ranges
    }
  }

  function getStepBarStyle(step: any) {
    const intensity = getStepIntensity(step)
    const range = getStepRange(step)

    if (range && (step.power?.ramp || step.heartRate?.ramp || step.pace?.ramp)) {
      // Hide standard bar for ramps, as the "Range" element handles the full shape
      return { height: '0%' }
    }

    const val = range ? range.start : intensity
    const color = getStepColor(intensity)
    const maxScale = chartMaxPower.value
    const height = (val / maxScale) * 100

    return {
      height: `${height}%`,
      backgroundColor: color
    }
  }

  function getStepColor(intensity: number): string {
    const zone =
      zoneDistribution.value.find((z) => intensity <= z.max) ||
      zoneDistribution.value[zoneDistribution.value.length - 1]
    return zone ? zone.color : '#9ca3af'
  }

  function getZoneName(intensity: number): string {
    const zone =
      zoneDistribution.value.find((z) => intensity <= z.max) ||
      zoneDistribution.value[zoneDistribution.value.length - 1]
    return zone ? zone.name : '??'
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    if (mins === 0) return `${secs}s`
    if (secs === 0) return `${mins}m`
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
</script>

<style scoped>
  .workout-chart-container {
    @apply w-full;
  }
</style>
