<template>
  <div class="workout-chart-container">
    <div
      v-if="!workoutData || !workoutData.steps || workoutData.steps.length === 0"
      class="text-center py-8 text-muted text-sm"
    >
      No structured workout data available.
    </div>

    <div v-else class="space-y-4">
      <!-- Legend -->
      <div class="flex items-center gap-4 text-xs">
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 rounded-xs bg-blue-500" />
          <span class="text-muted"
            >Intensity (%
            {{
              chartPreference === 'hr' ? 'LTHR' : chartPreference === 'pace' ? 'Pace' : 'FTP'
            }})</span
          >
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
                    <div class="font-semibold">{{ step.name }}</div>
                    <div class="text-[10px] opacity-80 mt-1">
                      {{ formatDuration(step.durationSeconds || step.duration || 0) }} @
                      {{ getStepIntensityLabel(step) }}
                      <span v-if="!step.heartRate && !step.power && !step.pace"> (Inferred)</span>
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
                      :style="getStepRangeStyle(step)"
                      class="absolute left-0 w-full pointer-events-none border-y border-current/40"
                    />
                    <!-- Primary Target Bar -->
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

        <div v-if="activeStepsTab === 'view'">
          <div
            class="hidden sm:grid items-center gap-4 px-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
            :style="{ gridTemplateColumns: stepTableGridTemplate }"
          >
            <div />
            <div>Step</div>
            <div
              v-for="column in stepTableColumns"
              :key="column.key"
              class="text-center"
              :class="{ 'text-right': column.align === 'right' }"
            >
              {{ column.label }}
            </div>
          </div>
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
                  <div class="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-shrink-0">
                    {{ formatDuration(step.durationSeconds || step.duration || 0) }}
                  </div>
                </div>
                <div
                  v-if="!showDistanceColumn && getStepEstimatedDistanceLabel(step)"
                  class="text-[10px] leading-tight text-muted pl-5"
                >
                  {{ getStepEstimatedDistanceLabel(step) }}
                </div>

                <div class="flex flex-wrap items-center gap-2 text-xs pl-5">
                  <span class="text-muted">{{ step.type }}</span>
                  <span
                    v-if="showDistanceColumn && getStepDistanceLabel(step)"
                    class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800"
                  >
                    {{ getStepDistanceLabel(step) }}
                  </span>
                  <span
                    v-if="showPowerColumn && hasMetricTarget(step.power)"
                    class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800"
                  >
                    {{ getPowerLabel(step) }}
                  </span>
                  <span
                    v-if="showHrColumn && hasMetricTarget(step.heartRate)"
                    class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800"
                  >
                    {{ getHrZoneLabel(step) }}
                  </span>
                  <span
                    v-if="showPaceColumn && hasMetricTarget(step.pace)"
                    class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800"
                  >
                    {{ getPaceLabel(step) }}
                  </span>
                  <span
                    v-if="showCadenceColumn && step.cadence"
                    class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-blue-500"
                  >
                    {{ step.cadence }} SPM
                  </span>
                  <div
                    v-if="showHrColumn && hasMetricTarget(step.heartRate) && getStepBpmLabel(step)"
                    class="basis-full text-[10px] leading-tight text-muted"
                  >
                    {{ getStepBpmLabel(step) }}
                  </div>
                </div>
              </div>

              <!-- Desktop View -->
              <div
                class="hidden sm:grid items-center gap-4"
                :style="{ gridTemplateColumns: stepTableGridTemplate }"
              >
                <div
                  class="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                  :style="{ backgroundColor: getStepColor(getStepIntensity(step)) }"
                />
                <div class="min-w-0">
                  <div class="text-sm font-medium truncate">{{ step.name }}</div>
                  <div class="text-xs text-muted">{{ step.type }}</div>
                </div>
                <div class="text-center">
                  <div
                    class="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap"
                  >
                    {{ formatDuration(step.durationSeconds || step.duration || 0) }}
                  </div>
                  <div
                    v-if="!showDistanceColumn && getStepEstimatedDistanceLabel(step)"
                    class="text-[10px] text-muted whitespace-nowrap"
                  >
                    {{ getStepEstimatedDistanceLabel(step) }}
                  </div>
                </div>
                <div
                  v-if="showDistanceColumn"
                  class="text-center text-sm text-muted whitespace-nowrap"
                >
                  <span v-if="getStepDistanceLabel(step)">{{ getStepDistanceLabel(step) }}</span>
                  <span v-else class="text-gray-300 dark:text-gray-700">-</span>
                </div>
                <div
                  v-if="showPowerColumn"
                  class="text-center text-sm font-semibold whitespace-nowrap"
                >
                  <span v-if="hasMetricTarget(step.power)">{{ getPowerLabel(step) }}</span>
                  <span v-else class="text-gray-300 dark:text-gray-700">-</span>
                </div>
                <div v-if="showHrColumn" class="text-center">
                  <div class="text-sm font-semibold whitespace-nowrap">
                    <span v-if="hasMetricTarget(step.heartRate)">{{ getHrZoneLabel(step) }}</span>
                    <span v-else class="text-gray-300 dark:text-gray-700">-</span>
                  </div>
                  <div
                    v-if="hasMetricTarget(step.heartRate) && getStepBpmLabel(step)"
                    class="text-[10px] text-muted whitespace-nowrap"
                  >
                    {{ getStepBpmLabel(step) }}
                  </div>
                </div>
                <div
                  v-if="showPaceColumn"
                  class="text-center text-sm font-semibold whitespace-nowrap"
                >
                  <span v-if="hasMetricTarget(step.pace)">{{ getPaceLabel(step) }}</span>
                  <span v-else class="text-gray-300 dark:text-gray-700">-</span>
                </div>
                <div
                  v-if="showCadenceColumn"
                  class="text-sm text-blue-500 font-semibold text-center whitespace-nowrap"
                >
                  <span v-if="step.cadence">{{ step.cadence }} SPM</span>
                  <span v-else class="text-gray-300 dark:text-gray-700">-</span>
                </div>
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
  import { formatCompactDuration } from '~/utils/duration'
  import { ZONE_COLORS } from '~/utils/zone-colors'
  import {
    getStructuredWorkoutPayload,
    resolveWorkoutChartSportSettings,
    getWorkoutChartPreference
  } from '~/utils/workoutChartContext'
  import WorkoutStepsEditor from './planned/WorkoutStepsEditor.vue'

  const props = withDefaults(
    defineProps<{
      workout: any // structuredWorkout JSON
      userFtp?: number
      preference?: 'hr' | 'power' | 'pace'
      sportSettings?: any
      allowEdit?: boolean
      stepsTab?: 'view' | 'edit'
    }>(),
    {
      preference: 'power',
      sportSettings: undefined
    }
  )

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
  const DEBUG_PREFIX = '[WorkoutRunChart]'

  function debugLog(event: string, payload?: Record<string, any>) {
    if (!import.meta.client) return

    const entry = {
      event,
      ...payload,
      timestamp: new Date().toISOString()
    }

    ;(window as any).__workoutRunChartDebug = entry

    if (payload) {
      console.debug(DEBUG_PREFIX, event, entry)
      return
    }

    console.debug(DEBUG_PREFIX, event)
  }

  function cloneDebugValue<T>(value: T): T {
    if (value === undefined) return value
    return JSON.parse(JSON.stringify(value))
  }

  function getPreferredMetricKey(): 'power' | 'heartRate' | 'pace' {
    return chartPreference.value === 'power'
      ? 'power'
      : chartPreference.value === 'hr'
        ? 'heartRate'
        : 'pace'
  }

  function findStepByUid(steps: any[] | null | undefined, uid: string | null): any | null {
    if (!uid || !Array.isArray(steps)) return null

    for (const step of steps) {
      if (step?.uid === uid) return step
      if (Array.isArray(step?.steps)) {
        const nested = findStepByUid(step.steps, uid)
        if (nested) return nested
      }
    }

    return null
  }

  function getSelectedStepDebugSnapshot(uid: string | null) {
    if (!uid) return null

    const sourceSteps =
      previewSteps.value || getStructuredWorkoutPayload(props.workout)?.steps || []
    const sourceStep = findStepByUid(sourceSteps, uid)
    const normalizedStep = normalizedSteps.value.find((step: any) => step.uid === uid) || null
    const preferredMetric = getPreferredMetricKey()
    const renderedTarget =
      normalizedStep?.power || normalizedStep?.heartRate || normalizedStep?.pace || null

    return {
      uid,
      chartPreference: chartPreference.value,
      preferredMetric,
      chartMaxPower: chartMaxPower.value,
      sourceStep: sourceStep
        ? {
            name: sourceStep.name,
            type: sourceStep.type,
            power: cloneDebugValue(sourceStep.power),
            heartRate: cloneDebugValue(sourceStep.heartRate),
            pace: cloneDebugValue(sourceStep.pace)
          }
        : null,
      normalizedStep: normalizedStep
        ? {
            name: normalizedStep.name,
            type: normalizedStep.type,
            intensity: getStepIntensity(normalizedStep),
            range: cloneDebugValue(getStepRange(normalizedStep)),
            preferredTarget: cloneDebugValue(normalizedStep[preferredMetric]),
            renderedTarget: cloneDebugValue(renderedTarget),
            barStyle: cloneDebugValue(getStepBarStyle(normalizedStep)),
            rangeStyle: cloneDebugValue(getStepRangeStyle(normalizedStep)),
            handleBottom: getHandleBottom(normalizedStep)
          }
        : null
    }
  }

  function getPreferredRenderTarget(step: any) {
    if (!step) return null

    const orderedTargets =
      chartPreference.value === 'hr'
        ? [step.heartRate, step.pace, step.power]
        : chartPreference.value === 'pace'
          ? [step.pace, step.heartRate, step.power]
          : [step.power, step.heartRate, step.pace]

    return (
      orderedTargets.find(
        (target) => target && (typeof target.value === 'number' || target.range)
      ) || null
    )
  }

  function getHandleBottom(step: any) {
    const val = getStepIntensity(step)
    return `${Math.min((val / chartMaxPower.value) * 100, 100)}%`
  }

  function handleBarMouseDown(event: MouseEvent, step: any) {
    selectedStepUid.value = step.uid
    debugLog('bar:mousedown', getSelectedStepDebugSnapshot(step.uid) || { uid: step.uid })
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
    dragStartIntensity.value = getStepIntensity(step)
    debugLog('drag:start', {
      clientY: event.clientY,
      startIntensity: dragStartIntensity.value,
      ...getSelectedStepDebugSnapshot(step.uid)
    })

    // Prevent text selection while dragging
    event.preventDefault()
  }

  function handleGlobalMouseMove(event: MouseEvent) {
    if (!isDragging.value || !dragStartStep.value) return

    const chartEl = (event.currentTarget as HTMLElement).closest('.relative.min-w-0')
    if (!chartEl) return

    const rect = chartEl.getBoundingClientRect()
    const relativeY = event.clientY - rect.top
    const height = rect.height

    // Calculate new intensity based on mouse position relative to chart
    const newIntensity = Math.max(0.1, (1 - relativeY / height) * chartMaxPower.value)
    const beforeSnapshot = getSelectedStepDebugSnapshot(dragStartStep.value.uid)

    // Ensure we are working on the current session steps
    let sourceSteps = previewSteps.value
    if (!sourceSteps) {
      sourceSteps = JSON.parse(
        JSON.stringify(getStructuredWorkoutPayload(props.workout)?.steps || [])
      )
    }

    if (updateIntensityRecursively(sourceSteps!, dragStartStep.value.uid, newIntensity)) {
      // Trigger reactivity and live preview
      previewSteps.value = [...sourceSteps!]
      debugLog('drag:move', {
        clientY: event.clientY,
        relativeY,
        chartHeight: height,
        newIntensity,
        beforeSnapshot,
        afterSourceStep: cloneDebugValue(findStepByUid(sourceSteps, dragStartStep.value.uid))
      })
    } else {
      debugLog('drag:move-missed-step', {
        clientY: event.clientY,
        relativeY,
        chartHeight: height,
        newIntensity,
        targetUid: dragStartStep.value.uid
      })
    }
  }

  function handleGlobalMouseUp() {
    if (isDragging.value) {
      debugLog('drag:end', {
        draggedUid: dragStartStep.value?.uid || null,
        previewStepCount: previewSteps.value?.length || 0,
        snapshot: getSelectedStepDebugSnapshot(dragStartStep.value?.uid || selectedStepUid.value)
      })
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
        // Use chartPreference to ensure we update the correct metric
        const metric = getPreferredMetricKey()
        let target = step[metric]
        const beforeTarget = cloneDebugValue(target)

        if (!target) {
          // If the preferred metric object doesn't exist, create it
          const unit = metric === 'power' ? '%' : metric === 'heartRate' ? 'LTHR' : 'Pace'
          step[metric] = { units: unit }
          target = step[metric]
        }

        if (target.range) {
          const diff = newValue - target.range.end
          target.range.start = Math.max(0, target.range.start + diff)
          target.range.end = newValue
        } else {
          target.value = newValue
        }
        debugLog('step:updateIntensity', {
          uid,
          metric,
          newValue,
          beforeTarget,
          afterTarget: cloneDebugValue(step[metric]),
          siblingTargets: {
            power: cloneDebugValue(step.power),
            heartRate: cloneDebugValue(step.heartRate),
            pace: cloneDebugValue(step.pace)
          }
        })
        found = true
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
    const target = getPreferredRenderTarget(step)
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

  function getStepIntensity(step: any): number {
    const hr = getTargetValue(normalizeMetricTarget(step.heartRate, 'hr'))
    const pwr = getTargetValue(step.power)
    const pace = getTargetValue(getRelativePaceTarget(step.pace))

    if (chartPreference.value === 'hr' && hr !== undefined) return hr
    if (chartPreference.value === 'pace' && pace !== undefined) return pace
    if (chartPreference.value === 'power' && pwr !== undefined) return pwr

    // Final fallbacks
    return pwr ?? hr ?? pace ?? getInferredIntensity(step)
  }

  // Computed properties
  const workoutData = computed(() => {
    const base = getStructuredWorkoutPayload(props.workout)
    if (activeStepsTab.value === 'edit' && previewSteps.value) {
      return { ...base, steps: previewSteps.value }
    }
    return base
  })

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

  const effectiveSportSettings = computed(() =>
    resolveWorkoutChartSportSettings(props.workout, props.sportSettings)
  )
  const normalizedSteps = computed(() => flattenWorkoutSteps(workoutData.value?.steps || []))

  watch(selectedStepUid, (uid) => {
    if (!uid) return
    debugLog('selection:changed', getSelectedStepDebugSnapshot(uid) || { uid })
  })

  watch(
    () => normalizedSteps.value,
    () => {
      if (!selectedStepUid.value) return
      debugLog('normalizedSteps:updated', getSelectedStepDebugSnapshot(selectedStepUid.value) || {})
    },
    { deep: true }
  )

  watch(
    () => previewSteps.value,
    (steps) => {
      if (!selectedStepUid.value || !steps) return
      debugLog('previewSteps:updated', {
        selectedUid: selectedStepUid.value,
        previewRootCount: steps.length,
        snapshot: getSelectedStepDebugSnapshot(selectedStepUid.value)
      })
    },
    { deep: true }
  )

  function handleStepsUpdate(newSteps: any[]) {
    previewSteps.value = newSteps
    emit('update:steps', newSteps)
  }

  const totalDuration = computed(() => {
    return normalizedSteps.value.reduce(
      (sum: number, step: any) => sum + (step.durationSeconds || step.duration || 0),
      0
    )
  })

  const showDistanceColumn = computed(() =>
    normalizedSteps.value.some((step: any) => hasDistance(step))
  )
  const showPowerColumn = computed(() =>
    normalizedSteps.value.some((step: any) => hasMetricTarget(step.power))
  )
  const showHrColumn = computed(() =>
    normalizedSteps.value.some((step: any) => hasMetricTarget(step.heartRate))
  )
  const showPaceColumn = computed(() =>
    normalizedSteps.value.some((step: any) => hasMetricTarget(step.pace))
  )
  const showCadenceColumn = computed(() =>
    normalizedSteps.value.some((step: any) => Number(step.cadence) > 0)
  )

  const stepTableColumns = computed(() => {
    const columns: Array<{ key: string; label: string; width: string; align?: 'left' | 'right' }> =
      [{ key: 'duration', label: 'Duration', width: '72px' }]
    if (showDistanceColumn.value)
      columns.push({ key: 'distance', label: 'Distance', width: '80px' })
    if (showPowerColumn.value) columns.push({ key: 'power', label: 'Power', width: '120px' })
    if (showHrColumn.value) columns.push({ key: 'hr', label: 'HR', width: '140px' })
    if (showPaceColumn.value) columns.push({ key: 'pace', label: 'Pace', width: '120px' })
    if (showCadenceColumn.value) columns.push({ key: 'cadence', label: 'Cadence', width: '90px' })
    return columns
  })

  const stepTableGridTemplate = computed(() => {
    const widths = ['12px', 'minmax(0, 1fr)', ...stepTableColumns.value.map((col) => col.width)]
    return widths.join(' ')
  })

  const chartMaxPower = computed(() => {
    let maxTarget = 0
    normalizedSteps.value.forEach((step: any) => {
      const range = getStepRange(step)
      if (range) {
        maxTarget = Math.max(maxTarget, range.end)
        return
      }

      maxTarget = Math.max(maxTarget, getStepIntensity(step))
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
    if (
      chartPreference.value === 'hr' &&
      effectiveSportSettings.value?.hrZones &&
      effectiveSportSettings.value.lthr
    ) {
      const lthr = effectiveSportSettings.value.lthr
      distribution = effectiveSportSettings.value.hrZones.map((z: any, i: number) => ({
        name: `Z${i + 1}`,
        longName: z.name || `Zone ${i + 1}`,
        min: z.min / lthr,
        max: z.max / lthr,
        duration: 0,
        color: ZONE_COLORS[i] || '#9ca3af'
      }))
    } else if (
      chartPreference.value === 'pace' &&
      effectiveSportSettings.value?.paceZones &&
      effectiveSportSettings.value.thresholdPace
    ) {
      const thresholdPace = effectiveSportSettings.value.thresholdPace
      distribution = effectiveSportSettings.value.paceZones.map((z: any, i: number) => ({
        name: `Z${i + 1}`,
        longName: z.name || `Zone ${i + 1}`,
        min: z.min / thresholdPace,
        max: z.max / thresholdPace,
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
    return `${zone.longName || zone.name}: ${formatDuration(zone.duration)} (${percent}%) (${chartPreference.value === 'hr' ? 'HR' : 'Power'})`
  }

  function getHeartRateReference(): number {
    const lthr = Number(effectiveSportSettings.value?.lthr)
    if (Number.isFinite(lthr) && lthr > 0) return lthr

    const maxHr = Number(effectiveSportSettings.value?.maxHr)
    if (Number.isFinite(maxHr) && maxHr > 0) return maxHr

    return 200
  }

  function toNormalizedHeartRate(value: number): number {
    if (!Number.isFinite(value) || value <= 0) return 0
    if (value <= 3) return value
    return value / getHeartRateReference()
  }

  function getHrZoneBoundsByIndex(indexRaw: number): { start: number; end: number } | null {
    const index = Math.max(1, Math.round(indexRaw))
    const zones = Array.isArray(effectiveSportSettings.value?.hrZones)
      ? effectiveSportSettings.value.hrZones
      : []
    const zone = zones[index - 1]
    if (zone && Number.isFinite(Number(zone.min)) && Number.isFinite(Number(zone.max))) {
      return { start: Number(zone.min), end: Number(zone.max) }
    }

    // Avoid circular reads against zoneDistribution while it is being computed.
    const defaultZoneRatios = [
      { min: 0, max: 0.75 },
      { min: 0.75, max: 0.85 },
      { min: 0.85, max: 0.95 },
      { min: 0.95, max: 1.05 },
      { min: 1.05, max: 1.25 }
    ]
    const fallbackZone = defaultZoneRatios[index - 1]
    if (fallbackZone) {
      const reference = getHeartRateReference()
      return {
        start: fallbackZone.min * reference,
        end: fallbackZone.max * reference
      }
    }

    return null
  }

  function getPaceZoneBoundsByIndex(indexRaw: number): { start: number; end: number } | null {
    const index = Math.max(1, Math.round(indexRaw))
    const zones = Array.isArray(effectiveSportSettings.value?.paceZones)
      ? effectiveSportSettings.value.paceZones
      : []
    const zone = zones[index - 1]
    if (zone && Number.isFinite(Number(zone.min)) && Number.isFinite(Number(zone.max))) {
      return { start: Number(zone.min), end: Number(zone.max) }
    }
    return null
  }

  function getPaceZoneIndexFromMps(speedMps: number): number | null {
    const zones = Array.isArray(effectiveSportSettings.value?.paceZones)
      ? effectiveSportSettings.value.paceZones
      : []
    if (!Number.isFinite(speedMps) || speedMps <= 0 || zones.length === 0) return null
    const idx = zones.findIndex((zone: any) => {
      const min = Number(zone?.min)
      const max = Number(zone?.max)
      return Number.isFinite(min) && Number.isFinite(max) && speedMps >= min && speedMps <= max
    })
    return idx >= 0 ? idx + 1 : null
  }

  function paceValueToMps(value: number, units?: string): number | null {
    if (!Number.isFinite(value) || value <= 0) return null
    const normalizedUnits = String(units || '')
      .trim()
      .toLowerCase()
    const thresholdPace = Number(effectiveSportSettings.value?.thresholdPace || 0)

    if (normalizedUnits.includes('/km')) {
      const secondsPerKm = value * 60
      return secondsPerKm > 0 ? 1000 / secondsPerKm : null
    }

    if (normalizedUnits === 'm/s') return value

    // Model output may sometimes use "Pace" while values are already absolute m/s.
    if (value > 1.5 && value < 8) return value

    if (thresholdPace > 0) {
      if (value > 3) return value / thresholdPace
      return value * thresholdPace
    }

    return null
  }

  function normalizePaceTarget(
    target: { value?: number; range?: { start: number; end: number }; units?: string } | undefined
  ): { value?: number; range?: { start: number; end: number }; units?: string } | undefined {
    if (!target) return undefined
    const units = String((target as any)?.units || '')
      .trim()
      .toLowerCase()

    if (units === '%pace' || units === 'percentpace') {
      if (target.range) {
        return {
          range: {
            start: target.range.start / 100,
            end: target.range.end / 100
          },
          units: 'pace'
        }
      }
      if (typeof target.value === 'number') {
        return {
          value: target.value / 100,
          units: 'pace'
        }
      }
    }

    if (units === 'pace_zone' || units === 'zone') {
      if (target.range) {
        const startZone = getPaceZoneBoundsByIndex(target.range.start)
        const endZone = getPaceZoneBoundsByIndex(target.range.end)
        if (startZone && endZone) {
          return {
            range: {
              start: startZone.start,
              end: endZone.end
            },
            units: 'm/s'
          }
        }
      }
      if (typeof target.value === 'number') {
        const zoneBounds = getPaceZoneBoundsByIndex(target.value)
        if (zoneBounds) {
          return {
            range: {
              start: zoneBounds.start,
              end: zoneBounds.end
            },
            units: 'm/s'
          }
        }
      }
    }

    return target
  }

  function getRelativePaceTarget(
    target: { value?: number; range?: { start: number; end: number }; units?: string } | undefined
  ): { value?: number; range?: { start: number; end: number } } | undefined {
    const normalized = normalizePaceTarget(target)
    if (!normalized) return undefined
    const thresholdPace = Number(props.sportSettings?.thresholdPace || 0)
    const convert = (value: number) => {
      const speedMps = paceValueToMps(value, normalized.units)
      if (speedMps !== null && thresholdPace > 0) return speedMps / thresholdPace
      if (value > 2) return value / 100
      return value
    }

    if (normalized.range) {
      return {
        range: {
          start: convert(normalized.range.start),
          end: convert(normalized.range.end)
        }
      }
    }

    if (typeof normalized.value === 'number') {
      return { value: convert(normalized.value) }
    }

    return undefined
  }

  function getPaceZoneLabel(
    target: { value?: number; range?: { start: number; end: number }; units?: string } | undefined
  ): string | null {
    const normalized = normalizePaceTarget(target)
    if (!normalized) return null
    const units = String(normalized.units || '')
      .trim()
      .toLowerCase()
    if (units === 'pace_zone' || units === 'zone') {
      const zoneValue =
        typeof normalized.value === 'number'
          ? Math.round(normalized.value)
          : normalized.range
            ? Math.round((normalized.range.start + normalized.range.end) / 2)
            : null
      return zoneValue ? `Z${zoneValue}` : null
    }

    const speedMps = normalized.range
      ? (normalized.range.start + normalized.range.end) / 2
      : typeof normalized.value === 'number'
        ? paceValueToMps(normalized.value, normalized.units)
        : null
    if (speedMps === null) return null
    const zoneIdx = getPaceZoneIndexFromMps(speedMps)
    return zoneIdx ? `Z${zoneIdx}` : null
  }

  function normalizeMetricTarget(
    target: { value?: number; range?: { start: number; end: number } } | undefined,
    metric: 'hr' | 'power' | 'pace'
  ): { value?: number; range?: { start: number; end: number }; units?: string } | undefined {
    if (!target) return undefined
    if (metric === 'pace') return normalizePaceTarget(target as any)
    if (metric !== 'hr') return target
    const units = String((target as any)?.units || '')
      .trim()
      .toLowerCase()

    if (units === 'hr_zone' || units === 'zone') {
      if (target.range) {
        const startZone = getHrZoneBoundsByIndex(target.range.start)
        const endZone = getHrZoneBoundsByIndex(target.range.end)
        if (startZone && endZone) {
          return {
            range: {
              start: toNormalizedHeartRate(startZone.start),
              end: toNormalizedHeartRate(endZone.end)
            }
          }
        }
      }
      if (typeof target.value === 'number') {
        const zoneBounds = getHrZoneBoundsByIndex(target.value)
        if (zoneBounds) {
          return {
            range: {
              start: toNormalizedHeartRate(zoneBounds.start),
              end: toNormalizedHeartRate(zoneBounds.end)
            }
          }
        }
      }
    }

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
      // Ensure the source step has a STABLE UID for interaction
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
        heartRate: normalizeTarget(step.heartRate) || step.heartRate,
        power: normalizeTarget(step.power) || step.power,
        pace: normalizeTarget(step.pace) || step.pace
      })
    })

    return flattened
  }

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
        const start = target.range.start !== undefined ? target.range.start : target.range[0]
        const end = target.range.end !== undefined ? target.range.end : target.range[1]
        return {
          range: {
            start: Number(start) || 0,
            end: Number(end) || 0
          },
          ramp: target.ramp,
          units: typeof target.units === 'string' ? target.units : undefined
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

  function getTargetValue(
    target: { value?: number; range?: { start: number; end: number } } | undefined
  ) {
    if (!target) return undefined
    if (typeof target.value === 'number') return target.value
    if (target.range) return (target.range.start + target.range.end) / 2
    return undefined
  }

  function formatTargetLabel(
    target: { value?: number; range?: { start: number; end: number } } | undefined,
    metric: 'hr' | 'power' | 'pace'
  ): string | null {
    if (!target) return null

    if (metric === 'hr') {
      const hrUnits = String((target as any)?.units || '')
        .trim()
        .toLowerCase()
      if (hrUnits === 'hr_zone' || hrUnits === 'zone') {
        if (typeof target.value === 'number') {
          return `Z${Math.round(target.value)} HR`
        }
        if (target.range) {
          return `Z${Math.round(target.range.start)}-Z${Math.round(target.range.end)} HR`
        }
      }

      const normalized = normalizeMetricTarget(target, 'hr')
      if (!normalized) return null

      if (normalized.range) {
        return `${Math.round(normalized.range.start * 100)}-${Math.round(normalized.range.end * 100)}% LTHR`
      }
      if (typeof normalized.value === 'number') {
        return `${Math.round(normalized.value * 100)}% LTHR`
      }
      return null
    }

    if (metric === 'power') {
      if (target.range) {
        return `${Math.round(target.range.start * 100)}-${Math.round(target.range.end * 100)}% FTP`
      }
      if (typeof target.value === 'number') {
        return `${Math.round(target.value * 100)}% FTP`
      }
      return null
    }

    const paceZoneLabel = getPaceZoneLabel(target as any)
    if (paceZoneLabel) return `${paceZoneLabel} Pace`

    const normalizedPace = normalizeMetricTarget(target as any, 'pace')
    if (!normalizedPace) return null
    if (String(normalizedPace?.units || '').toLowerCase() === 'm/s' && normalizedPace?.range) {
      return `${normalizedPace.range.start.toFixed(2)}-${normalizedPace.range.end.toFixed(2)} m/s`
    }
    if (
      String(normalizedPace?.units || '').toLowerCase() === 'm/s' &&
      typeof normalizedPace?.value === 'number'
    ) {
      return `${normalizedPace.value.toFixed(2)} m/s`
    }

    if (normalizedPace.range) {
      return `${Math.round(normalizedPace.range.start * 100)}-${Math.round(normalizedPace.range.end * 100)}% Pace`
    }
    if (typeof normalizedPace.value === 'number') {
      return `${Math.round(normalizedPace.value * 100)}% Pace`
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
    if (value > 2.5 && value < 8) return value
    return null
  }

  function estimateStepSpeedMps(step: any): number {
    const thresholdPace = Number(effectiveSportSettings.value?.thresholdPace || 0)
    const lthr = Number(effectiveSportSettings.value?.lthr || 0)
    const ftp = Number(effectiveSportSettings.value?.ftp || 0)

    const paceMid = getTargetValue(normalizeMetricTarget(step.pace, 'pace'))
    if (paceMid !== undefined) {
      const paceMps = paceValueToMps(
        paceMid,
        (normalizeMetricTarget(step.pace, 'pace') as any)?.units
      )
      if (paceMps) return paceMps
      if (thresholdPace > 0) {
        const factor = paceMid > 3 ? paceMid / thresholdPace : paceMid
        return Math.max(1.4, Math.min(7.5, factor * thresholdPace))
      }
    }

    const hrMid = getTargetValue(normalizeMetricTarget(step.heartRate, 'hr'))
    if (hrMid !== undefined && thresholdPace > 0) {
      let factor = hrMid
      const hrUnits = String(step.heartRate?.units || '')
        .trim()
        .toLowerCase()
      if (hrUnits === 'bpm' && lthr > 0) factor = hrMid / lthr
      return Math.max(1.4, Math.min(7.5, Math.max(0.5, Math.min(1.3, factor)) * thresholdPace))
    }

    const powerMid = getTargetValue(step.power)
    if (powerMid !== undefined && thresholdPace > 0) {
      const units = String(step.power?.units || '')
        .trim()
        .toLowerCase()
      let factor = powerMid
      if ((units === 'w' || units === 'watts') && ftp > 0) factor = powerMid / ftp
      else if (powerMid > 3) factor = powerMid / 100
      return Math.max(1.4, Math.min(7.5, Math.max(0.5, Math.min(1.4, factor)) * thresholdPace))
    }

    return step.type === 'Rest' ? 2.2 : 2.7
  }

  function getStepEstimatedDistanceLabel(step: any): string | null {
    if (hasDistance(step)) return null
    const durationSec = Number(step.durationSeconds || step.duration || 0)
    if (!Number.isFinite(durationSec) || durationSec <= 0) return null
    const meters = Math.max(0, Math.round(durationSec * estimateStepSpeedMps(step)))
    if (meters <= 0) return null
    return `~${formatDistance(meters)} est.`
  }

  function getStepDistanceLabel(step: any): string | null {
    if (hasDistance(step)) return formatDistance(step.distance)
    return getStepEstimatedDistanceLabel(step)
  }

  function hasMetricTarget(target: any): boolean {
    const normalized = normalizeTarget(target)
    if (!normalized) return false
    if (typeof normalized.value === 'number') return true
    return Boolean(normalized.range)
  }

  function hasDistance(step: any): boolean {
    return Number(step?.distance) > 0
  }

  function formatDistance(distance: number): string {
    const meters = Number(distance || 0)
    if (!Number.isFinite(meters) || meters <= 0) return '-'
    if (meters >= 1000) {
      if (meters % 1000 === 0) return `${meters / 1000} km`
      return `${(meters / 1000).toFixed(1)} km`
    }
    return `${Math.round(meters)} m`
  }

  function getPowerLabel(step: any): string {
    return formatTargetLabel(step.power, 'power') || '-'
  }

  function getPaceLabel(step: any): string {
    return formatTargetLabel(step.pace, 'pace') || '-'
  }

  function getHrZoneLabel(step: any): string {
    const normalized = normalizeMetricTarget(step.heartRate, 'hr')
    const value = getTargetValue(normalized)
    if (value === undefined) return '-'
    return `${getZoneName(value)} HR`
  }

  function getStepRange(step: any) {
    const target = getPreferredRenderTarget(step)
    return target?.range
  }

  function getInferredIntensity(step: any): number {
    const power = getTargetValue(step.power)
    if (power !== undefined) return power

    const hr = getTargetValue(normalizeMetricTarget(step.heartRate, 'hr'))
    if (hr !== undefined) return hr

    const pace = getTargetValue(normalizeMetricTarget(step.pace, 'pace'))
    if (pace !== undefined) return pace

    if (step?.type === 'Rest') return 0.55
    return 0.75
  }

  function getStepColor(intensity: number): string {
    const zone =
      zoneDistribution.value.find((z) => intensity <= z.max) ||
      zoneDistribution.value[zoneDistribution.value.length - 1]
    return zone ? zone.color : '#9ca3af'
  }

  function getStepIntensityLabel(step: any): string {
    const targetByMetric: Record<'hr' | 'power' | 'pace', any> = {
      hr: step.heartRate,
      power: step.power,
      pace: step.pace
    }

    const orderedMetrics: ('hr' | 'power' | 'pace')[] =
      chartPreference.value === 'power'
        ? ['power', 'hr', 'pace']
        : chartPreference.value === 'pace'
          ? ['pace', 'hr', 'power']
          : ['hr', 'power', 'pace']

    for (const metric of orderedMetrics) {
      const label = formatTargetLabel(targetByMetric[metric], metric)
      if (label) return label
    }

    const preferenceUnit =
      chartPreference.value === 'hr' ? 'LTHR' : chartPreference.value === 'pace' ? 'Pace' : 'FTP'
    return `${Math.round(getInferredIntensity(step) * 100)}% ${preferenceUnit}`
  }

  function getStepBpmLabel(step: any): string | null {
    const normalized = normalizeMetricTarget(step.heartRate, 'hr')
    if (!normalized) return null

    const reference = getHeartRateReference()
    if (normalized.range) {
      const low = Math.round(normalized.range.start * reference)
      const high = Math.round(normalized.range.end * reference)
      return `${low}-${high} bpm`
    }
    if (typeof normalized.value === 'number') {
      return `${Math.round(normalized.value * reference)} bpm`
    }
    return null
  }

  function getStepContainerStyle(step: any) {
    const width = ((step.durationSeconds || step.duration || 0) / totalDuration.value) * 100
    return {
      width: `${width}%`,
      height: '100%',
      minWidth: '2px'
    }
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

  function getZoneName(intensity: number): string {
    const zone =
      zoneDistribution.value.find((z) => intensity <= z.max) ||
      zoneDistribution.value[zoneDistribution.value.length - 1]
    return zone ? zone.name : '??'
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
