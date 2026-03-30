<template>
  <div class="space-y-1">
    <div
      class="bg-white dark:bg-gray-900 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors group relative"
    >
      <!-- Desktop Layout -->
      <div
        class="hidden sm:grid items-start gap-4 grid-cols-[32px_1fr_48px_70px_80px_150px_70px_32px]"
      >
        <!-- Col 0: Drag Handle -->
        <div
          class="flex items-center justify-center cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 drag-handle pt-1"
        >
          <UIcon name="i-heroicons-bars-2" class="w-4 h-4" />
        </div>

        <!-- Col 1: Combined Content (Dot, Name, Type) -->
        <div class="min-w-0 space-y-1" :style="indentStyle">
          <div class="flex items-center gap-2">
            <!-- Dot -->
            <div
              class="w-3 h-3 rounded-full flex-shrink-0"
              :style="{ backgroundColor: stepColor }"
            />
            <!-- Name -->
            <UInput
              v-model="localName"
              placeholder="Step Name"
              size="xs"
              variant="none"
              class="p-0 font-bold placeholder:italic hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors focus:bg-white dark:focus:bg-gray-950 flex-1"
              :ui="{ padding: { xs: 'px-1 py-0.5' } }"
              @update:model-value="emitUpdate"
            />
          </div>
          <!-- Type & Reps -->
          <div class="flex items-center gap-1.5">
            <USelect
              v-model="localType"
              :items="['Warmup', 'Active', 'Rest', 'Cooldown']"
              size="xs"
              variant="none"
              class="p-0 text-muted uppercase text-[9px] font-black tracking-widest w-20"
              :ui="{ padding: { xs: 'px-0 py-0' } }"
              @update:model-value="emitUpdate"
            />
            <div v-if="hasNestedSteps" class="flex items-center gap-1">
              <span class="text-[9px] text-gray-400 font-bold uppercase">x</span>
              <UInput
                v-model.number="localReps"
                type="number"
                size="xs"
                variant="none"
                class="w-14 p-0 font-black text-primary text-[10px]"
                :ui="{ padding: { xs: 'px-0 py-0' } }"
                @update:model-value="emitUpdate"
              />
            </div>
          </div>
        </div>

        <!-- Col 2: Zone -->
        <div
          class="text-center text-sm font-black text-gray-500 dark:text-gray-400 tabular-nums pt-0.5"
        >
          <template v-if="!hasNestedSteps">{{ zoneName }}</template>
        </div>

        <!-- Col 3: Cadence -->
        <div class="text-center pt-0.5">
          <div v-if="!hasNestedSteps" class="flex items-center justify-center gap-0.5">
            <UInput
              v-model.number="localCadence"
              type="number"
              size="xs"
              variant="none"
              placeholder="--"
              class="w-12 p-0 text-blue-500 font-black text-center text-sm"
              :ui="{ padding: { xs: 'px-0 py-0' } }"
              @update:model-value="emitUpdate"
            />
            <span class="text-[9px] text-blue-400 uppercase font-bold tracking-tight">{{
              cadenceUnit
            }}</span>
          </div>
        </div>

        <!-- Col 4: Duration -->
        <div class="text-right pt-0.5">
          <div v-if="!hasNestedSteps" class="flex items-center justify-end gap-1">
            <UInput
              v-model.number="localDurationMin"
              type="number"
              size="xs"
              variant="none"
              class="w-14 p-0 text-right text-muted font-bold text-[10px]"
              :ui="{ padding: { xs: 'px-0 py-0' } }"
              @update:model-value="emitUpdate"
            />
            <span class="text-[8px] text-gray-400 uppercase font-bold">MIN</span>
          </div>
        </div>

        <!-- Col 5: Intensity (Ramp Support) -->
        <div class="text-right pt-0.5">
          <div v-if="!hasNestedSteps" class="flex items-center justify-end gap-1">
            <div class="flex flex-col items-end">
              <div class="flex items-center gap-1">
                <UInput
                  v-model.number="localIntensityStart"
                  type="number"
                  size="xs"
                  variant="none"
                  class="w-14 p-0 text-right font-black text-sm"
                  :ui="{ padding: { xs: 'px-0 py-0' } }"
                  @update:model-value="handleIntensityStartChange"
                />
                <template v-if="localIsRamp">
                  <span class="text-[9px] text-gray-400 font-bold">-</span>
                  <UInput
                    v-model.number="localIntensityEnd"
                    type="number"
                    size="xs"
                    variant="none"
                    class="w-14 p-0 text-right font-black text-sm"
                    :ui="{ padding: { xs: 'px-0 py-0' } }"
                    @update:model-value="emitUpdate"
                  />
                </template>
                <span class="text-[9px] text-gray-400 uppercase font-black">{{
                  intensityUnit
                }}</span>
              </div>
              <UButton
                v-if="localType !== 'Rest'"
                variant="ghost"
                size="xs"
                class="p-0 h-auto text-[8px] font-black uppercase tracking-tighter"
                :color="localIsRamp ? 'primary' : 'neutral'"
                @click="toggleRamp"
              >
                {{ localIsRamp ? 'Ramp On' : 'Set Ramp' }}
              </UButton>
            </div>
          </div>
        </div>

        <!-- Col 6: Metric Value (Watts/BPM/Pace) -->
        <div class="text-right pt-0.5">
          <div v-if="!hasNestedSteps" class="text-sm font-black text-primary tabular-nums">
            {{ formattedValue }}<span class="text-[9px] ml-0.5 opacity-60">{{ valueUnit }}</span>
          </div>
        </div>

        <!-- Col 7: Actions -->
        <div
          class="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity pt-0.5"
        >
          <UDropdownMenu
            :items="[
              [
                {
                  label: 'Add Step After',
                  icon: 'i-heroicons-plus',
                  onSelect: () => $emit('add-after')
                },
                {
                  label: 'Add Nested Step',
                  icon: 'i-heroicons-chevron-double-right',
                  onSelect: () => $emit('add-nested')
                },
                {
                  label: 'Remove Step',
                  icon: 'i-heroicons-trash',
                  color: 'error' as const,
                  onSelect: () => $emit('remove')
                }
              ]
            ]"
          >
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-heroicons-ellipsis-vertical"
            />
          </UDropdownMenu>
        </div>
      </div>

      <!-- Mobile Layout (simplified) -->
      <div class="flex flex-col gap-2 sm:hidden px-1">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <div class="cursor-grab active:cursor-grabbing text-gray-300 drag-handle">
              <UIcon name="i-heroicons-bars-2" class="w-4 h-4" />
            </div>
            <div
              class="w-2.5 h-2.5 rounded-full flex-shrink-0"
              :style="{ backgroundColor: stepColor }"
            />
            <UInput
              v-model="localName"
              placeholder="Step Name"
              size="sm"
              variant="none"
              class="p-0 font-bold flex-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-1 transition-colors"
              :ui="{ padding: { sm: 'px-0 py-0' } }"
              @update:model-value="emitUpdate"
            />
          </div>
          <div class="flex items-center gap-2">
            <UInput
              v-if="!hasNestedSteps"
              v-model.number="localDurationMin"
              type="number"
              size="xs"
              variant="none"
              class="w-14 p-0 text-right font-black"
              :ui="{ padding: { xs: 'px-0 py-0' } }"
              @update:model-value="emitUpdate"
            />
            <span v-if="!hasNestedSteps" class="text-[9px] text-gray-400 font-bold">MIN</span>
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-heroicons-trash"
              @click="$emit('remove')"
            />
          </div>
        </div>
        <div v-if="!hasNestedSteps" class="flex items-center gap-4 pl-4.5">
          <USelect
            v-model="localType"
            :items="['Warmup', 'Active', 'Rest', 'Cooldown']"
            size="xs"
            class="w-24"
            @update:model-value="emitUpdate"
          />
          <div class="flex flex-col items-center gap-0.5">
            <div class="flex items-center gap-1">
              <UInput
                v-model.number="localIntensityStart"
                type="number"
                size="xs"
                class="w-12 text-center font-black"
                @update:model-value="handleIntensityStartChange"
              />
              <template v-if="localIsRamp">
                <span class="text-[9px] text-gray-400">-</span>
                <UInput
                  v-model.number="localIntensityEnd"
                  type="number"
                  size="xs"
                  class="w-12 text-center font-black"
                  @update:model-value="emitUpdate"
                />
              </template>
              <span class="text-[9px] text-gray-400 font-bold">{{ intensityUnitShort }}</span>
            </div>
            <UButton
              v-if="localType !== 'Rest'"
              variant="ghost"
              size="xs"
              class="p-0 h-auto text-[8px] font-black uppercase"
              :color="localIsRamp ? 'primary' : 'neutral'"
              @click="toggleRamp"
            >
              {{ localIsRamp ? 'Ramp' : '+ Ramp' }}
            </UButton>
          </div>
          <div class="flex items-center gap-1">
            <UInput
              v-model.number="localCadence"
              type="number"
              size="xs"
              class="w-16 text-center font-black text-blue-500"
              @update:model-value="emitUpdate"
            />
            <span class="text-[9px] text-blue-400 font-bold uppercase">{{ cadenceUnit }}</span>
          </div>
        </div>
        <!-- For repeats on mobile, just show the type/reps if it has children -->
        <div v-else class="flex items-center gap-4 pl-4.5">
          <USelect
            v-model="localType"
            :items="['Warmup', 'Active', 'Rest', 'Cooldown']"
            size="xs"
            class="w-24"
            @update:model-value="emitUpdate"
          />
          <div class="flex items-center gap-1">
            <span class="text-[9px] text-gray-400 font-bold uppercase">x</span>
            <UInput
              v-model.number="localReps"
              type="number"
              size="xs"
              variant="none"
              class="w-10 p-0 font-black text-primary text-[10px]"
              :ui="{ padding: { xs: 'px-0 py-0' } }"
              @update:model-value="emitUpdate"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Nested Steps -->
    <div v-if="hasNestedSteps" class="ml-2 border-l border-primary-500/20 pl-2 mt-1 space-y-1">
      <draggable
        :model-value="step.steps"
        item-key="uid"
        handle=".drag-handle"
        ghost-class="opacity-50"
        @update:model-value="updateStepsOrder"
        @change="$emit('update:duration')"
      >
        <template #item="{ element: child, index: cIdx }">
          <WorkoutStepRow
            :step="child"
            :index="cIdx"
            :depth="depth + 1"
            :metric="metric"
            :user-ftp="userFtp"
            :sport-settings="sportSettings"
            @remove="removeNested(cIdx)"
            @update:duration="$emit('update:duration')"
            @update:power="$emit('update:power')"
            @add-nested="addNestedToChild(child)"
            @add-after="addStepAfterNested(cIdx)"
            @update:step="updateChildStep(cIdx, $event)"
          />
        </template>
      </draggable>
    </div>
  </div>
</template>

<script setup lang="ts">
  import draggable from 'vuedraggable'
  import { ZONE_COLORS } from '~/utils/zone-colors'

  const props = defineProps<{
    step: any
    index: number
    depth: number
    metric: 'power' | 'hr' | 'pace'
    userFtp?: number
    sportSettings?: any
  }>()

  const emit = defineEmits([
    'remove',
    'update:duration',
    'update:power',
    'add-nested',
    'add-after',
    'update:step'
  ])

  // Local state
  const localName = ref(props.step.name || '')
  const localType = ref(props.step.type || 'Active')
  const localDurationMin = ref(props.step._durationMin || 0)
  const localIntensityStart = ref(props.step._intensityStartPct || 0)
  const localIntensityEnd = ref(props.step._intensityEndPct || 0)
  const localIsRamp = ref(!!props.step._isRamp)
  const localCadence = ref(props.step.cadence || null)
  const localReps = ref(props.step.reps || 1)

  // Watch for external changes
  watch(
    () => props.step,
    (newStep) => {
      localName.value = newStep.name || ''
      localType.value = newStep.type || 'Active'
      localDurationMin.value = newStep._durationMin || 0
      localIntensityStart.value = newStep._intensityStartPct || 0
      localIntensityEnd.value = newStep._intensityEndPct || 0
      localIsRamp.value = !!newStep._isRamp
      localCadence.value = newStep.cadence || null
      localReps.value = newStep.reps || 1
    },
    { deep: true }
  )

  const hasNestedSteps = computed(
    () => Array.isArray(props.step.steps) && props.step.steps.length > 0
  )
  const indentStyle = computed(() => ({ paddingLeft: `${Math.min(props.depth, 5) * 12}px` }))

  const intensityUnit = computed(() => {
    if (props.metric === 'power') return '%'
    if (props.metric === 'hr') return '% LTHR'
    return '% PACE'
  })

  const intensityUnitShort = computed(() => {
    if (props.metric === 'power') return '%'
    if (props.metric === 'hr') return '%'
    return '%'
  })

  const cadenceUnit = computed(() => {
    return props.metric === 'pace' ? 'SPM' : 'RPM'
  })

  const valueUnit = computed(() => {
    if (props.metric === 'power') return 'W'
    if (props.metric === 'hr') return 'BPM'
    return '/KM'
  })

  const currentIntensity = computed(() => {
    return localIsRamp.value
      ? (localIntensityStart.value + localIntensityEnd.value) / 200
      : localIntensityStart.value / 100
  })

  const zoneName = computed(() => {
    const intensity = currentIntensity.value
    let zones = []
    let refValue = 0

    if (props.metric === 'power') {
      zones = props.sportSettings?.powerZones || []
      refValue = props.sportSettings?.ftp || props.userFtp || 0
    } else if (props.metric === 'hr') {
      zones = props.sportSettings?.hrZones || []
      refValue = props.sportSettings?.lthr || 0
    } else {
      zones = props.sportSettings?.paceZones || []
      refValue = props.sportSettings?.thresholdPace || 0
    }

    if (zones.length > 0 && refValue > 0) {
      const absValue = intensity * refValue
      const idx = zones.findIndex((z: any) => absValue <= Number(z.max))
      return idx !== -1 ? `Z${idx + 1}` : 'Z?'
    }

    // Fallback
    if (intensity <= 0.55) return 'Z1'
    else if (intensity <= 0.75) return 'Z2'
    else if (intensity <= 0.9) return 'Z3'
    else if (intensity <= 1.05) return 'Z4'
    else if (intensity <= 1.2) return 'Z5'
    return 'Z6'
  })

  const stepColor = computed(() => {
    if (hasNestedSteps.value) return 'transparent'
    const intensity = currentIntensity.value
    let colorIdx = 0
    if (intensity <= 0.55) colorIdx = 0
    else if (intensity <= 0.75) colorIdx = 1
    else if (intensity <= 0.9) colorIdx = 2
    else if (intensity <= 1.05) colorIdx = 3
    else if (intensity <= 1.2) colorIdx = 4
    else colorIdx = 5

    return ZONE_COLORS[colorIdx] || '#9ca3af'
  })

  const formattedValue = computed(() => {
    const intensity = currentIntensity.value
    let refValue = 0
    if (props.metric === 'power') refValue = props.sportSettings?.ftp || props.userFtp || 0
    else if (props.metric === 'hr') refValue = props.sportSettings?.lthr || 0
    else refValue = props.sportSettings?.thresholdPace || 0

    if (!refValue) return '-'

    if (props.metric === 'pace') {
      const speedMps = intensity * refValue
      if (!speedMps) return '-'
      const secondsPerKm = 1000 / speedMps
      const mins = Math.floor(secondsPerKm / 60)
      const secs = Math.round(secondsPerKm % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return Math.round(intensity * refValue)
  })

  function handleIntensityStartChange() {
    if (!localIsRamp.value) {
      localIntensityEnd.value = localIntensityStart.value
    }
    emitUpdate()
  }

  function emitUpdate() {
    const updatedStep = { ...props.step }
    updatedStep.name = localName.value
    updatedStep.type = localType.value
    updatedStep.reps = localReps.value
    updatedStep.cadence = localCadence.value
    updatedStep.durationSeconds = localDurationMin.value * 60
    updatedStep.duration = updatedStep.durationSeconds

    // Internal state for editor
    updatedStep._durationMin = localDurationMin.value
    updatedStep._intensityStartPct = localIntensityStart.value
    updatedStep._intensityEndPct = localIntensityEnd.value
    updatedStep._isRamp = localIsRamp.value

    const target: any = {}
    if (localIsRamp.value || localIntensityStart.value !== localIntensityEnd.value) {
      target.range = {
        start: localIntensityStart.value / 100,
        end: localIntensityEnd.value / 100
      }
      target.ramp = localIsRamp.value
    } else {
      target.value = localIntensityStart.value / 100
    }

    // Update the correct metric object and CLEAR others to prevent backend confusion
    if (props.metric === 'power') {
      updatedStep.power = { ...target, units: '%' }
      delete updatedStep.heartRate
      delete updatedStep.pace
      updatedStep.primaryTarget = 'power'
    } else if (props.metric === 'hr') {
      updatedStep.heartRate = { ...target, units: 'LTHR' }
      delete updatedStep.power
      delete updatedStep.pace
      updatedStep.primaryTarget = 'heartRate'
    } else {
      updatedStep.pace = { ...target, units: 'Pace' }
      delete updatedStep.power
      delete updatedStep.heartRate
      updatedStep.primaryTarget = 'pace'
    }

    emit('update:step', updatedStep)
    emit('update:duration')
  }

  function toggleRamp() {
    localIsRamp.value = !localIsRamp.value
    if (!localIsRamp.value) {
      localIntensityEnd.value = localIntensityStart.value
    }
    emitUpdate()
  }

  function updateStepsOrder(newSteps: any[]) {
    const updatedStep = { ...props.step }
    updatedStep.steps = newSteps
    emit('update:step', updatedStep)
  }

  function updateChildStep(idx: number, child: any) {
    if (props.step.steps) {
      const updatedStep = { ...props.step }
      updatedStep.steps = [...props.step.steps]
      updatedStep.steps[idx] = child
      emit('update:step', updatedStep)
      emit('update:duration')
    }
  }

  function removeNested(idx: number) {
    const updatedStep = { ...props.step }
    updatedStep.steps = [...props.step.steps]
    updatedStep.steps.splice(idx, 1)
    emit('update:step', updatedStep)
    emit('update:duration')
  }

  function addNestedToChild(child: any) {
    const updatedChild = { ...child }
    if (!updatedChild.steps) updatedChild.steps = []
    if (!updatedChild.reps) updatedChild.reps = 2

    const defaultTarget = {
      value: 1.0,
      units: props.metric === 'power' ? '%' : props.metric === 'hr' ? 'LTHR' : 'Pace'
    }

    updatedChild.steps = [
      ...updatedChild.steps,
      {
        uid: Math.random().toString(36).substring(7),
        type: 'Active',
        name: 'Interval',
        durationSeconds: 60,
        duration: 60,
        _durationMin: 1,
        [props.metric]: defaultTarget,
        _intensityStartPct: 100,
        _intensityEndPct: 100,
        _isRamp: false
      }
    ]

    const idx = props.step.steps.findIndex((s: any) => s.uid === child.uid)
    if (idx !== -1) {
      updateChildStep(idx, updatedChild)
    }
  }

  function addStepAfterNested(idx: number) {
    const updatedStep = { ...props.step }
    updatedStep.steps = [...props.step.steps]
    const defaultTarget = {
      value: 0.7,
      units: props.metric === 'power' ? '%' : props.metric === 'hr' ? 'LTHR' : 'Pace'
    }

    updatedStep.steps.splice(idx + 1, 0, {
      uid: Math.random().toString(36).substring(7),
      type: 'Active',
      name: 'New Step',
      durationSeconds: 300,
      duration: 300,
      _durationMin: 5,
      [props.metric]: defaultTarget,
      _intensityStartPct: 70,
      _intensityEndPct: 70,
      _isRamp: false
    })
    emit('update:step', updatedStep)
    emit('update:duration')
  }
</script>
