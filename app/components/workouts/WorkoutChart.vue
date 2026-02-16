<template>
  <div class="workout-chart-container">
    <div v-if="normalizedSteps.length === 0" class="text-center py-8 text-muted text-sm">
      No structured workout data available.
    </div>

    <div v-else class="space-y-4">
      <!-- Legend -->
      <div class="flex items-center gap-4 text-xs">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-xs bg-amber-500" />
          <span class="text-xs text-muted">Planned Intensity</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-1 bg-blue-300 border border-blue-300 border-dashed" />
          <span class="text-muted">Cadence (Inferred Baseline)</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-1 bg-white" />
          <span class="text-muted">Cadence (Explicit)</span>
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
            <span v-for="label in yAxisLabels" :key="label">{{ label }}%</span>
          </div>

          <!-- Chart area -->
          <div class="flex-1 relative min-w-0 h-[140px] sm:h-[200px]">
            <!-- Grid lines -->
            <div class="absolute inset-0 flex flex-col justify-between">
              <div v-for="i in 6" :key="i" class="border-t border-gray-200 dark:border-gray-700" />
            </div>

            <!-- Power bars -->
            <div class="absolute inset-0 flex items-end gap-0.5">
              <UTooltip
                v-for="(step, index) in normalizedSteps"
                :key="index"
                :popper="{ placement: 'top' }"
                :style="getStepContainerStyle(step)"
                class="relative flex items-end h-full"
              >
                <template #text>
                  <div class="font-semibold">{{ getStepName(step) }}</div>
                  <div class="text-[10px] opacity-80 mt-1">
                    {{ formatDuration(step.durationSeconds || step.duration || 0) }} @
                    <span v-if="step.power?.range">
                      {{ Math.round(step.power.range.start * 100) }}-{{
                        Math.round(step.power.range.end * 100)
                      }}% FTP
                    </span>
                    <span v-else> {{ Math.round((step.power?.value || 0) * 100) }}% FTP </span>
                  </div>
                  <div v-if="userFtp" class="text-[10px] opacity-80">
                    <span v-if="step.power?.range">
                      {{ Math.round(step.power.range.start * userFtp) }}-{{
                        Math.round(step.power.range.end * userFtp)
                      }}W
                    </span>
                    <span v-else> {{ Math.round((step.power?.value || 0) * userFtp) }}W </span>
                  </div>
                  <div class="text-[10px] opacity-80 border-t border-white/20 mt-1 pt-1">
                    Target Cadence:
                    {{ Math.round(getStepCadenceMeta(step).value) }} RPM
                    <span v-if="getStepCadenceMeta(step).inferred" class="text-blue-200">
                      (inferred)
                    </span>
                  </div>
                </template>

                <!-- Wrapper to force stacking context -->
                <div class="relative w-full h-full flex items-end">
                  <!-- Range Shade -->
                  <div
                    v-if="getStepRange(step)"
                    :style="getStepRangeShadeStyle(step)"
                    class="absolute left-0 w-full pointer-events-none border-y border-current/40"
                  />
                  <!-- Bar -->
                  <div
                    :style="getStepBarStyle(step)"
                    class="w-full transition-all hover:opacity-80"
                  />
                </div>
              </UTooltip>
            </div>

            <!-- Cadence Line Overlay -->
            <svg
              class="absolute inset-0 pointer-events-none z-10"
              preserveAspectRatio="none"
              viewBox="0 0 1000 100"
            >
              <path
                :d="cadencePaths.merged"
                fill="none"
                stroke="#93c5fd"
                stroke-width="2"
                stroke-dasharray="4,2"
                class="drop-shadow-sm opacity-90"
              />
              <path
                :d="cadencePaths.explicit"
                fill="none"
                stroke="white"
                stroke-width="2"
                class="drop-shadow-sm opacity-70"
              />
            </svg>
          </div>
          <!-- Cadence Y-axis labels -->
          <div
            class="flex flex-col justify-between text-xs text-muted w-8 sm:w-12 pl-1 sm:pl-2 text-left h-[140px] sm:h-[200px]"
          >
            <span v-for="label in cadenceAxisLabels" :key="label">{{ label }}</span>
          </div>
        </div>

        <!-- X-axis (time) -->
        <div class="flex mt-2 ml-12 mr-12">
          <div class="flex-1 flex justify-between text-xs text-muted">
            <span>0:00</span>
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
                    :style="{ backgroundColor: getStepColor(step) }"
                  />
                  <span class="text-sm font-medium truncate" :style="getStepIndentStyle(step)">{{
                    getStepName(step)
                  }}</span>
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
                    {{
                      getZone(
                        step.power?.value ||
                          (step.power?.range
                            ? (step.power.range.start + step.power.range.end) / 2
                            : 0)
                      )
                    }}
                  </div>

                  <!-- Cadence -->
                  <div class="w-16 flex-shrink-0">
                    <span
                      class="text-blue-500"
                      :class="{
                        'italic text-blue-300 dark:text-blue-400': getStepCadenceMeta(step).inferred
                      }"
                    >
                      {{ Math.round(getStepCadenceMeta(step).value) }} rpm
                    </span>
                  </div>

                  <!-- Avg Watts -->
                  <div v-if="userFtp" class="w-12 text-primary font-medium flex-shrink-0">
                    {{ getAvgWatts(step, userFtp) }}w
                  </div>

                  <!-- Power % -->
                  <div class="w-18 font-bold flex-shrink-0">
                    <span v-if="step.power?.range">
                      {{ Math.round(step.power.range.start * 100) }}-{{
                        Math.round(step.power.range.end * 100)
                      }}% FTP
                    </span>
                    <span v-else> {{ Math.round((step.power?.value || 0) * 100) }}% FTP </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Desktop View -->
            <div
              class="hidden sm:grid items-center gap-4"
              :class="
                userFtp
                  ? 'grid-cols-[12px_1fr_54px_80px_110px_70px]'
                  : 'grid-cols-[12px_1fr_54px_80px_110px]'
              "
            >
              <div
                class="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                :style="{ backgroundColor: getStepColor(step) }"
              />
              <div class="min-w-0" :style="getStepIndentStyle(step)">
                <div class="text-sm font-medium truncate">{{ getStepName(step) }}</div>
                <div class="text-xs text-muted">{{ step.type }}</div>
              </div>
              <div class="text-center text-sm font-bold text-gray-500 dark:text-gray-400">
                {{
                  getZone(
                    step.power?.value ||
                      (step.power?.range ? (step.power.range.start + step.power.range.end) / 2 : 0)
                  )
                }}
              </div>
              <div
                class="text-sm text-blue-500 font-semibold text-center whitespace-nowrap"
                :class="{
                  'italic text-blue-300 dark:text-blue-400': getStepCadenceMeta(step).inferred
                }"
              >
                <span>{{ Math.round(getStepCadenceMeta(step).value) }} RPM</span>
              </div>
              <div class="text-right">
                <div class="text-sm font-bold whitespace-nowrap">
                  <span v-if="step.power?.range">
                    {{ Math.round(step.power.range.start * 100) }}-{{
                      Math.round(step.power.range.end * 100)
                    }}% FTP
                  </span>
                  <span v-else> {{ Math.round((step.power?.value || 0) * 100) }}% FTP </span>
                </div>
                <div class="text-[10px] text-muted">
                  {{ formatDuration(step.durationSeconds || step.duration || 0) }}
                </div>
              </div>

              <!-- Average Watts -->
              <div v-if="userFtp" class="text-right">
                <div class="text-sm font-bold text-primary">
                  {{ getAvgWatts(step, userFtp) }}<span class="text-[10px] ml-0.5">W</span>
                </div>
                <div class="text-[9px] text-muted uppercase">Avg</div>
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
            class="flex flex-col p-1.5 bg-gray-50 dark:bg-gray-900 rounded border border-gray-100 dark:border-gray-800"
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

      <!-- Summary Stats -->
      <div
        class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-gray-200 dark:border-gray-700"
      >
        <div class="text-center">
          <div class="text-xs text-muted">Total Time</div>
          <div class="text-lg font-bold">{{ formatDuration(totalDuration) }}</div>
        </div>
        <div class="text-center">
          <div class="text-xs text-muted">Avg Power</div>
          <div class="text-lg font-bold">{{ Math.round(avgPower * 100) }}%</div>
        </div>
        <div class="text-center">
          <div class="text-xs text-muted">Max Power</div>
          <div class="text-lg font-bold">{{ Math.round(maxPower * 100) }}%</div>
        </div>
        <div v-if="userFtp" class="text-center">
          <div class="text-xs text-muted">Avg Watts</div>
          <div class="text-lg font-bold">{{ Math.round(avgPower * userFtp) }}W</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ZONE_COLORS } from '~/utils/zone-colors'

  const props = defineProps<{
    workout: any // structuredWorkout JSON
    userFtp?: number
    sportSettings?: any
  }>()

  const normalizedSteps = computed(() => flattenWorkoutSteps(props.workout?.steps || []))

  const totalDuration = computed(() => {
    return normalizedSteps.value.reduce(
      (acc: number, step: any) => acc + (step.durationSeconds || step.duration || 0),
      0
    )
  })

  const chartMaxPower = computed(() => {
    if (!normalizedSteps.value.length) return 1.5 // Fallback to 150% FTP
    let max = 0
    normalizedSteps.value.forEach((step: any) => {
      const val = step.power?.range ? step.power.range.end : step.power?.value || 0
      if (val > max) max = val
    })
    // Ensure we always have at least 100% FTP scale, and some padding above max
    return Math.max(1.0, max * 1.1)
  })

  const yAxisLabels = computed(() => {
    const max = chartMaxPower.value * 100
    const step = max / 5
    return Array.from({ length: 6 }, (_, i) => Math.round(max - i * step))
  })

  const avgPower = computed(() => {
    if (!normalizedSteps.value.length || totalDuration.value === 0) return 0
    const totalWork = normalizedSteps.value.reduce((acc: number, step: any) => {
      const val = step.power?.range
        ? (step.power.range.start + step.power.range.end) / 2
        : step.power?.value || 0
      const duration = step.durationSeconds || step.duration || 0
      return acc + val * duration
    }, 0)
    return totalWork / totalDuration.value
  })

  const maxPower = computed(() => {
    if (!normalizedSteps.value.length) return 0
    return normalizedSteps.value.reduce((acc: number, step: any) => {
      const val = step.power?.range ? step.power.range.end : step.power?.value || 0
      return Math.max(acc, val)
    }, 0)
  })

  const cadenceAxisLabels = computed(() => {
    return [120, 100, 80, 60, 40, 0]
  })

  const cadencePaths = computed(() => {
    if (!normalizedSteps.value.length || totalDuration.value === 0) {
      return { merged: '', explicit: '' }
    }

    let mergedPath = ''
    let explicitPath = ''
    let currentTime = 0

    normalizedSteps.value.forEach((step: any) => {
      const stepDuration = Number(step.durationSeconds || step.duration || 0)
      if (stepDuration <= 0) return

      const cadenceMeta = getStepCadenceMeta(step)
      const startX = (currentTime / totalDuration.value) * 1000
      const endX = ((currentTime + stepDuration) / totalDuration.value) * 1000
      const y = 100 - (Math.max(0, Math.min(cadenceMeta.value, 120)) / 120) * 100

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

  const zoneDistribution = computed(() => {
    // Default zones if settings are missing
    let distribution = [
      // Z1: Emerald Green (Recovery)
      { name: 'Z1', min: 0, max: 0.55, duration: 0, color: ZONE_COLORS[0] },
      // Z2: Royal Blue (Endurance)
      { name: 'Z2', min: 0.55, max: 0.75, duration: 0, color: ZONE_COLORS[1] },
      // Z3: Amber/Gold (Tempo)
      { name: 'Z3', min: 0.75, max: 0.9, duration: 0, color: ZONE_COLORS[2] },
      // Z4: Deep Orange (Threshold)
      { name: 'Z4', min: 0.9, max: 1.05, duration: 0, color: ZONE_COLORS[3] },
      // Z5: Bright Red (VO2 Max)
      { name: 'Z5', min: 1.05, max: 1.2, duration: 0, color: ZONE_COLORS[4] },
      // Z6: Electric Purple (Anaerobic)
      { name: 'Z6', min: 1.2, max: 9.99, duration: 0, color: ZONE_COLORS[5] }
    ]

    // Use sport specific Power zones if available
    if (props.sportSettings?.powerZones && props.sportSettings.ftp) {
      const ftp = props.sportSettings.ftp
      distribution = props.sportSettings.powerZones.map((z: any, i: number) => ({
        name: `Z${i + 1}`,
        longName: z.name || `Zone ${i + 1}`,
        min: z.min / ftp,
        max: z.max / ftp,
        duration: 0,
        color: ZONE_COLORS[i] || '#9ca3af'
      }))
    }

    if (!normalizedSteps.value.length) return distribution

    normalizedSteps.value.forEach((step: any) => {
      // If range (ramp), take average
      const val = step.power?.range
        ? (step.power.range.start + step.power.range.end) / 2
        : step.power?.value || 0

      const power = val
      const duration = step.durationSeconds || step.duration || 0

      const zone = distribution.find((z) => power <= z.max) || distribution[distribution.length - 1]
      if (zone) zone.duration += duration
    })

    return distribution
  })

  // Functions
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
        return {
          range: {
            start: Number(target.range.start) || 0,
            end: Number(target.range.end) || 0
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

  function getStepIntensity(step: any): number {
    const power = getTargetValue(step.power)
    if (power !== undefined) return power

    const hr = getTargetValue(step.heartRate)
    if (hr !== undefined) return hr

    const pace = getTargetValue(step.pace)
    if (pace !== undefined) return pace

    if (step?.type === 'Rest') return 0.55
    return 0.75
  }

  function getStepCadenceMeta(step: any): { value: number; inferred: boolean } {
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
        power: normalizeTarget(step.power) || step.power,
        heartRate: normalizeTarget(step.heartRate) || step.heartRate,
        pace: normalizeTarget(step.pace) || step.pace
      })
    })

    return flattened
  }

  function getStepName(step: any): string {
    return step?.name || (step?.type === 'Rest' ? 'Rest' : 'Step')
  }

  function getStepIndentStyle(step: any) {
    const depth = Number(step?._depth) || 0
    return depth > 0 ? { paddingLeft: `${Math.min(depth, 5) * 12}px` } : undefined
  }

  function getStepContainerStyle(step: any) {
    if (totalDuration.value === 0) {
      return {
        width: '0%',
        minWidth: '2px'
      }
    }

    const width = ((step.durationSeconds || step.duration || 0) / totalDuration.value) * 100
    return {
      width: `${width}%`,
      minWidth: '2px'
    }
  }

  function getStepRange(step: any) {
    return step.power?.range
  }

  function getStepRangeShadeStyle(step: any) {
    const range = getStepRange(step)
    if (!range) return {}

    const maxScale = chartMaxPower.value
    const startH = Math.min(range.start / maxScale, 1) * 100
    const endH = Math.min(range.end / maxScale, 1) * 100

    // Ramp logic: Trapezoid from Start to End
    // Backward compatibility: if ramp is missing but range exists, assume ramp
    if (step.power?.ramp === true || (step.power?.range && step.power?.ramp === undefined)) {
      const startY = 100 - startH
      const endY = 100 - endH
      // Polygon: Top-Left (0% startY), Top-Right (100% endY), Bottom-Right (100% 100%), Bottom-Left (0% 100%)
      return {
        height: '100%',
        bottom: '0%',
        backgroundColor: getStepColor(step),
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
      backgroundColor: getStepColor(step),
      opacity: 0.2 // Default opacity for ranges
    }
  }

  function getStepBarStyle(step: any) {
    const color = getStepColor(step)
    const maxScale = chartMaxPower.value

    if (step.power?.ramp === true || (step.power?.range && step.power?.ramp === undefined)) {
      // Hide standard bar for ramps, as the "Range" element handles the full shape
      return { height: '0%' }
    }

    if (step.power?.range) {
      // Solid bar to min (base requirement)
      const val = step.power.range.start
      const height = Math.min(val / maxScale, 1) * 100

      return {
        height: `${height}%`,
        backgroundColor: color
      }
    } else {
      // Flat logic
      const height = Math.min((step.power?.value || 0) / maxScale, 1) * 100

      return {
        height: `${height}%`,
        backgroundColor: color
      }
    }
  }

  function getZoneSegmentTooltip(zone: any) {
    if (totalDuration.value === 0) {
      return `${zone.longName || zone.name}: ${formatDuration(zone.duration)}`
    }
    const percent = Math.round((zone.duration / totalDuration.value) * 100)
    return `${zone.longName || zone.name}: ${formatDuration(zone.duration)} (${percent}%) (Power)`
  }

  function getZone(power: number): string {
    const zone =
      zoneDistribution.value.find((z) => power <= z.max) ||
      zoneDistribution.value[zoneDistribution.value.length - 1]
    return zone ? zone.name : '??'
  }

  function getAvgWatts(step: any, ftp: number): number {
    if (step.power?.range) {
      return Math.round(((step.power.range.start + step.power.range.end) / 2) * ftp)
    }
    return Math.round((step.power?.value || 0) * ftp)
  }

  function getStepColor(step: any): string {
    const val = step.power?.range
      ? (step.power.range.start + step.power.range.end) / 2
      : step.power?.value || 0

    const zone =
      zoneDistribution.value.find((z) => val <= z.max) ||
      zoneDistribution.value[zoneDistribution.value.length - 1]
    return zone ? zone.color : '#9ca3af'
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
