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
          <span class="text-xs text-muted"
            >Planned Intensity (%
            {{
              chartPreference === 'hr' ? 'LTHR' : chartPreference === 'pace' ? 'Pace' : 'FTP'
            }})</span
          >
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
            <div
              class="absolute inset-0 flex items-end gap-0.5"
              @mousemove="handleGlobalMouseMove"
              @mouseup="handleGlobalMouseUp"
              @mouseleave="handleGlobalMouseUp"
            >
              <div
                v-for="(step, index) in normalizedSteps"
                :key="index"
                :style="getStepContainerStyle(step)"
                class="relative flex items-end h-full group/bar"
                :class="[
                  selectedStepUid === step.uid ? 'z-20' : 'z-0',
                  { 'opacity-40': selectedStepUid && selectedStepUid !== step.uid }
                ]"
                @mousedown="handleBarMouseDown($event, step)"
              >
                <UTooltip :popper="{ placement: 'top' }" class="w-full h-full flex items-end">
                  <template #text>
                    <div class="font-semibold">{{ getStepName(step) }}</div>
                    <div class="text-[10px] opacity-80 mt-1">
                      {{ formatDuration(step.durationSeconds || step.duration || 0) }} @
                      <span>{{ formatPowerTarget(step) }}</span>
                    </div>
                    <div v-if="hasRefValue" class="text-[10px] opacity-80">
                      <span>{{ getAvgValue(step) }} {{ absUnit }}</span>
                    </div>
                  </template>

                  <!-- Wrapper to force stacking context -->
                  <div
                    class="relative w-full h-full flex items-end cursor-pointer"
                    :class="[
                      {
                        'ring-2 ring-primary ring-inset rounded-sm shadow-[0_0_15px_rgba(var(--color-primary-500),0.4)]':
                          selectedStepUid === step.uid
                      }
                    ]"
                  >
                    <!-- Range Shade -->
                    <div
                      v-if="getStepRange(step)"
                      :style="getStepRangeShadeStyle(step)"
                      class="absolute left-0 w-full pointer-events-none border-y border-current/40"
                    />
                    <!-- Bar -->
                    <div
                      :style="getStepBarStyle(step)"
                      class="w-full transition-all group-hover/bar:opacity-80"
                    />

                    <!-- Drag Handle (Top Edge) -->
                    <div
                      v-if="allowEdit"
                      class="absolute left-0 w-full h-4 -translate-y-1/2 cursor-ns-resize z-30 flex items-center justify-center group/handle"
                      :style="{ bottom: getHandleBottom(step) }"
                      @mousedown.stop="handleHandleMouseDown($event, step)"
                    >
                      <div
                        class="w-4 h-1 bg-white/40 rounded-full opacity-0 group-hover/handle:opacity-100 transition-opacity"
                      />
                    </div>
                  </div>
                </UTooltip>
              </div>
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
        <div
          class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2 mb-4"
        >
          <h4 class="text-sm font-semibold text-muted">Workout Steps</h4>
          <UTabs
            v-if="allowEdit"
            v-model="activeStepsTab"
            :items="[
              { label: 'View', value: 'view', icon: 'i-heroicons-list-bullet' },
              { label: 'Edit', value: 'edit', icon: 'i-heroicons-pencil-square' }
            ]"
            size="xs"
            :ui="{ list: 'w-auto' }"
          />
        </div>

        <div v-if="activeStepsTab === 'view'" class="space-y-1">
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
                  <div v-if="hasRefValue" class="w-12 text-primary font-medium flex-shrink-0">
                    {{ getAvgValue(step) }} {{ absUnit }}
                  </div>

                  <!-- Power % -->
                  <div class="w-18 font-bold flex-shrink-0">
                    <span>{{ formatPowerTarget(step) }}</span>
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
                  <span>{{ formatPowerTarget(step) }}</span>
                </div>
                <div class="text-[10px] text-muted">
                  {{ formatDuration(step.durationSeconds || step.duration || 0) }}
                </div>
              </div>

              <!-- Average Value -->
              <div v-if="hasRefValue" class="text-right">
                <div class="text-sm font-bold text-primary">
                  {{ getAvgValue(step) }}<span class="text-[10px] ml-0.5">{{ absUnit }}</span>
                </div>
                <div class="text-[9px] text-muted uppercase">Avg</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Editor Tab -->
        <div v-else-if="activeStepsTab === 'edit'">
          <WorkoutStepsEditor
            :steps="getStructuredWorkoutPayload(workout)?.steps || []"
            :user-ftp="userFtp"
            :sport-settings="sportSettings"
            :preference="chartPreference"
            @update:steps="handleStepsUpdate"
            @save="$emit('save', $event)"
            @cancel="activeStepsTab = 'view'"
          />
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
        <div v-if="hasRefValue" class="text-center">
          <div class="text-xs text-muted">
            Avg
            {{ chartPreference === 'hr' ? 'HR' : chartPreference === 'pace' ? 'Pace' : 'Watts' }}
          </div>
          <div class="text-lg font-bold">
            {{
              getAvgValue({
                power: { value: avgPower },
                heartRate: { value: avgPower },
                pace: { value: avgPower }
              })
            }}
            {{ absUnit }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { formatCompactDuration } from '~/utils/duration'
  import { ZONE_COLORS } from '~/utils/zone-colors'
  import {
    getStructuredWorkoutPayload,
    resolveWorkoutChartSportSettings,
    getWorkoutChartPreference
  } from '~/utils/workoutChartContext'
  import WorkoutStepsEditor from './planned/WorkoutStepsEditor.vue'

  const props = defineProps<{
    workout: any // structuredWorkout JSON
    userFtp?: number
    sportSettings?: any
    allowEdit?: boolean
    stepsTab?: 'view' | 'edit'
  }>()

  const emit = defineEmits(['update:steps', 'save', 'cancel', 'update:stepsTab'])

  const activeStepsTab = computed({
    get: () => props.stepsTab || 'view',
    set: (val) => emit('update:stepsTab', val)
  })

  // Visual Manipulation State
  const selectedStepUid = ref<string | null>(null)
  const isDragging = ref(false)
  const dragStartStep = ref<any>(null)
  const dragStartY = ref(0)
  const dragStartIntensity = ref(0)

  function getHandleBottom(step: any) {
    const target = step.power || step.heartRate || step.pace
    const val = target?.range ? target.range.end : target?.value || 0
    return `${Math.min((val / chartMaxPower.value) * 100, 100)}%`
  }

  function handleBarMouseDown(event: MouseEvent, step: any) {
    selectedStepUid.value = step.uid
  }

  function handleHandleMouseDown(event: MouseEvent, step: any) {
    if (!props.allowEdit) return

    // Auto-switch to edit mode if not already there
    if (activeStepsTab.value !== 'edit') {
      activeStepsTab.value = 'edit'
    }

    isDragging.value = true
    selectedStepUid.value = step.uid
    dragStartStep.value = step
    dragStartY.value = event.clientY

    const target = step.power || step.heartRate || step.pace
    dragStartIntensity.value = target?.range ? target.range.end : target?.value || 0

    // Prevent text selection while dragging
    event.preventDefault()
  }

  function handleGlobalMouseMove(event: MouseEvent) {
    if (!isDragging.value || !dragStartStep.value) return

    // Find the chart container to get relative mouse position
    const chartEl = (event.currentTarget as HTMLElement).closest('.relative.min-w-0')
    if (!chartEl) return

    const rect = chartEl.getBoundingClientRect()
    const relativeY = event.clientY - rect.top
    const height = rect.height

    // Calculate new intensity based on mouse position relative to chart
    const newIntensity = Math.max(0.1, (1 - relativeY / height) * chartMaxPower.value)

    // We must update the actual source steps in the workoutData payload
    // Ensure we are working on the current session steps
    let sourceSteps = previewSteps.value
    if (!sourceSteps) {
      sourceSteps = JSON.parse(
        JSON.stringify(getStructuredWorkoutPayload(props.workout)?.steps || [])
      )
    }

    const wasUpdated = updateIntensityRecursively(
      sourceSteps!,
      dragStartStep.value.uid,
      newIntensity
    )

    if (wasUpdated) {
      // Trigger reactivity and live preview
      previewSteps.value = [...sourceSteps!]
    }
  }

  function handleGlobalMouseUp() {
    if (isDragging.value) {
      isDragging.value = false
      dragStartStep.value = null
      if (previewSteps.value) {
        emit('update:steps', previewSteps.value)
      }
    }
  }

  function updateIntensityRecursively(steps: any[], uid: string, newValue: number) {
    let found = false
    for (const step of steps) {
      if (step.uid === uid) {
        const metric = step.power ? 'power' : step.heartRate ? 'heartRate' : 'pace'
        const target = step[metric]

        if (target) {
          if (target.range) {
            const diff = newValue - target.range.end
            target.range.start = Math.max(0, target.range.start + diff)
            target.range.end = newValue
          } else {
            target.value = newValue
          }
          found = true
        }
      }

      if (step.steps && Array.isArray(step.steps)) {
        if (updateIntensityRecursively(step.steps, uid, newValue)) {
          found = true
        }
      }
    }
    return found
  }

  const previewSteps = ref<any[] | null>(null)

  const workoutData = computed(() => {
    const base = getStructuredWorkoutPayload(props.workout)
    if (activeStepsTab.value === 'edit' && previewSteps.value) {
      return { ...base, steps: previewSteps.value }
    }
    return base
  })

  const effectiveSportSettings = computed(() =>
    resolveWorkoutChartSportSettings(props.workout, props.sportSettings)
  )
  const normalizedSteps = computed(() => flattenWorkoutSteps(workoutData.value?.steps || []))

  const chartPreference = computed(() => {
    const steps = workoutData.value?.steps || []
    let hasHr = false
    let hasPower = false
    let hasPace = false

    const hasValue = (obj: any) => {
      if (!obj) return false
      if (typeof obj.value === 'number') return true
      if (obj.range && typeof obj.range.start === 'number' && typeof obj.range.end === 'number')
        return true
      return false
    }

    const visit = (nodes: any[]) => {
      nodes.forEach((s: any) => {
        if (hasValue(s.heartRate)) hasHr = true
        if (hasValue(s.power)) hasPower = true
        if (hasValue(s.pace)) hasPace = true
        if (s.steps) visit(s.steps)
      })
    }
    visit(steps)

    return getWorkoutChartPreference(props.workout, props.sportSettings, {
      hasHr,
      hasPower,
      hasPace
    })
  })

  function handleStepsUpdate(newSteps: any[]) {
    previewSteps.value = newSteps
    emit('update:steps', newSteps)
  }

  const defaultZoneRanges: Array<{ start: number; end: number }> = [
    { start: 0, end: 0.55 },
    { start: 0.55, end: 0.75 },
    { start: 0.75, end: 0.9 },
    { start: 0.9, end: 1.05 },
    { start: 1.05, end: 1.2 },
    { start: 1.2, end: 1.5 },
    { start: 1.5, end: 2.0 }
  ]

  const totalDuration = computed(() => {
    return normalizedSteps.value.reduce(
      (acc: number, step: any) => acc + (step.durationSeconds || step.duration || 0),
      0
    )
  })

  const chartMaxPower = computed(() => {
    if (!normalizedSteps.value.length) return 1.5
    let max = 0
    normalizedSteps.value.forEach((step: any) => {
      const target = step.power || step.heartRate || step.pace
      const val = target?.range ? target.range.end : target?.value || 0
      if (val > max) max = val
    })
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
      const target = step.power || step.heartRate || step.pace
      const val = target?.range ? (target.range.start + target.range.end) / 2 : target?.value || 0
      const duration = step.durationSeconds || step.duration || 0
      return acc + val * duration
    }, 0)
    return totalWork / totalDuration.value
  })

  const maxPower = computed(() => {
    if (!normalizedSteps.value.length) return 0
    return normalizedSteps.value.reduce((acc: number, step: any) => {
      const target = step.power || step.heartRate || step.pace
      const val = target?.range ? target.range.end : target?.value || 0
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
    if (effectiveSportSettings.value?.powerZones && effectiveSportSettings.value.ftp) {
      const ftp = effectiveSportSettings.value.ftp
      distribution = effectiveSportSettings.value.powerZones.map((z: any, i: number) => ({
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
  ):
    | { value?: number; range?: { start: number; end: number }; ramp?: boolean; units?: string }
    | undefined {
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
          ramp: target.ramp,
          units: typeof target.units === 'string' ? target.units : target.range.units
        }
      }
      if (target.start !== undefined && target.end !== undefined) {
        return {
          range: {
            start: Number(target.start) || 0,
            end: Number(target.end) || 0
          },
          ramp: target.ramp,
          units: typeof target.units === 'string' ? target.units : undefined
        }
      }
      if (target.value !== undefined) {
        return {
          value: Number(target.value) || 0,
          units: typeof target.units === 'string' ? target.units : undefined
        }
      }
    }

    return undefined
  }

  function resolveZoneRange(zone: number): { start: number; end: number } | null {
    if (!Number.isFinite(zone)) return null
    const zoneIndex = Math.max(1, Math.round(zone)) - 1

    const sportZones = effectiveSportSettings.value?.powerZones
    const referenceFtp = Number(effectiveSportSettings.value?.ftp || props.userFtp || 0)
    if (
      Array.isArray(sportZones) &&
      sportZones[zoneIndex] &&
      Number.isFinite(referenceFtp) &&
      referenceFtp > 0
    ) {
      const minW = Number(sportZones[zoneIndex].min)
      const maxW = Number(sportZones[zoneIndex].max)
      if (Number.isFinite(minW) && Number.isFinite(maxW) && maxW > 0) {
        return { start: minW / referenceFtp, end: maxW / referenceFtp }
      }
    }

    return defaultZoneRanges[zoneIndex] || null
  }

  function normalizePowerTarget(target: any):
    | {
        value?: number
        range?: { start: number; end: number }
        ramp?: boolean
        units?: string
        zone?: number
        originalUnits?: string
        originalValue?: number
        originalRange?: { start: number; end: number }
      }
    | undefined {
    const normalized = normalizeTarget(target)
    if (!normalized) return undefined

    const units = normalized.units?.toLowerCase()
    const referenceFtp = Number(effectiveSportSettings.value?.ftp || props.userFtp || 0)

    if (units === 'w' || units === 'watts') {
      if (normalized.range && referenceFtp > 0) {
        return {
          range: {
            start: normalized.range.start / referenceFtp,
            end: normalized.range.end / referenceFtp
          },
          ramp: normalized.ramp,
          units: 'ratio',
          originalUnits: units,
          originalRange: {
            start: normalized.range.start,
            end: normalized.range.end
          }
        }
      }
      if (typeof normalized.value === 'number' && referenceFtp > 0) {
        return {
          value: normalized.value / referenceFtp,
          ramp: normalized.ramp,
          units: 'ratio',
          originalUnits: units,
          originalValue: normalized.value
        }
      }
      return normalized
    }

    if (units !== 'power_zone') return normalized

    if (typeof normalized.value === 'number') {
      const range = resolveZoneRange(normalized.value)
      if (range) {
        const zone = Math.max(1, Math.round(normalized.value))
        return {
          value: (range.start + range.end) / 2,
          zone,
          units: 'ratio',
          ramp: false
        }
      }
    }

    if (normalized.range) {
      const startZone = resolveZoneRange(normalized.range.start)
      const endZone = resolveZoneRange(normalized.range.end)
      if (startZone && endZone) {
        const start = Math.max(1, Math.round(normalized.range.start))
        const end = Math.max(1, Math.round(normalized.range.end))
        return {
          value:
            (Math.min(startZone.start, endZone.start) + Math.max(startZone.end, endZone.end)) / 2,
          zone: start === end ? start : undefined,
          units: 'ratio',
          ramp: false
        }
      }
    }

    return normalized
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
  function flattenWorkoutSteps(steps: any[], depth = 0): any[] {
    if (!Array.isArray(steps)) return []

    const flattened: any[] = []

    steps.forEach((step: any) => {
      // Ensure the source step has a STABLE UID for interaction
      // We assign it back to the source object so it persists across re-renders
      if (!step.uid) {
        step.uid = `step-${Math.random().toString(36).substring(7)}`
      }

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
        power: normalizePowerTarget(step.power) || step.power,
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
    const target = step.power || step.heartRate || step.pace
    return target?.range
  }

  function getStepRangeShadeStyle(step: any) {
    const range = getStepRange(step)
    if (!range) return {}

    const target = step.power || step.heartRate || step.pace
    const maxScale = chartMaxPower.value
    const startH = Math.min(range.start / maxScale, 1) * 100
    const endH = Math.min(range.end / maxScale, 1) * 100

    // Ramp logic: Trapezoid from Start to End
    if (target?.ramp === true) {
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
    const target = step.power || step.heartRate || step.pace

    if (target?.ramp === true) {
      // Hide standard bar for ramps, as the "Range" element handles the full shape
      return { height: '0%' }
    }

    if (target?.range) {
      // Solid bar to min (base requirement)
      const val = target.range.start
      const height = Math.min(val / maxScale, 1) * 100

      return {
        height: `${height}%`,
        backgroundColor: color
      }
    } else {
      // Flat logic
      const height = Math.min((target?.value || 0) / maxScale, 1) * 100

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

  const absUnit = computed(() => {
    if (chartPreference.value === 'hr') return 'BPM'
    if (chartPreference.value === 'pace') return ''
    return 'W'
  })

  const hasRefValue = computed(() => {
    if (chartPreference.value === 'hr') return !!effectiveSportSettings.value?.lthr
    if (chartPreference.value === 'pace') return !!effectiveSportSettings.value?.thresholdPace
    return !!(effectiveSportSettings.value?.ftp || props.userFtp)
  })

  function getAvgValue(step: any): string | number {
    const target = step.power || step.heartRate || step.pace
    if (!target) return '-'

    let refValue = 0
    if (chartPreference.value === 'hr') refValue = effectiveSportSettings.value?.lthr || 0
    else if (chartPreference.value === 'pace')
      refValue = effectiveSportSettings.value?.thresholdPace || 0
    else refValue = effectiveSportSettings.value?.ftp || props.userFtp || 0

    if (!refValue) return '-'

    const intensity = target.range ? (target.range.start + target.range.end) / 2 : target.value || 0

    if (chartPreference.value === 'pace') {
      const speedMps = intensity * refValue
      if (!speedMps) return '-'
      const secondsPerKm = 1000 / speedMps
      const mins = Math.floor(secondsPerKm / 60)
      const secs = Math.round(secondsPerKm % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return Math.round(intensity * refValue)
  }

  function getStepColor(step: any): string {
    const target = step.power || step.heartRate || step.pace
    const val = target?.range ? (target.range.start + target.range.end) / 2 : target?.value || 0

    const zone =
      zoneDistribution.value.find((z) => val <= z.max) ||
      zoneDistribution.value[zoneDistribution.value.length - 1]
    return zone ? zone.color : '#9ca3af'
  }

  function formatPowerTarget(step: any): string {
    const target = step?.power || step?.heartRate || step?.pace
    if (!target) return 'N/A'

    const unit = target.units || (step.power ? '% FTP' : step.heartRate ? '% LTHR' : '% Pace')
    // Ensure there's a space if the unit doesn't start with %
    const displayUnit = unit.startsWith('%') ? unit : ` ${unit}`

    if (typeof target.zone === 'number') return `Z${target.zone}`
    if (target.originalRange && target.originalUnits) {
      return `${Math.round(target.originalRange.start)}-${Math.round(
        target.originalRange.end
      )} ${target.originalUnits}`
    }
    if (typeof target.originalValue === 'number' && target.originalUnits) {
      return `${Math.round(target.originalValue)} ${target.originalUnits}`
    }
    if (target.range) {
      return `${Math.round(target.range.start * 100)}-${Math.round(
        target.range.end * 100
      )}${displayUnit}`
    }
    return `${Math.round((target.value || 0) * 100)}${displayUnit}`
  }

  function formatDuration(seconds: number): string {
    return formatCompactDuration(seconds)
  }
</script>

<style scoped>
  .workout-chart-container {
    @apply w-full;
  }
</style>
