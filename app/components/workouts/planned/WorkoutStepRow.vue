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
              ui="{ padding: { xs: 'px-1 py-0.5' } }"
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
              ui="{ padding: { xs: 'px-0 py-0' } }"
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
                ui="{ padding: { xs: 'px-0 py-0' } }"
                @update:model-value="emitUpdate"
              />
            </div>
          </div>
        </div>

        <!-- Col 2: Zone -->
        <div
          class="text-center text-sm font-black text-gray-500 dark:text-gray-400 tabular-nums pt-0.5"
        >
          {{ zoneName }}
        </div>

        <!-- Col 3: Cadence -->
        <div class="text-center pt-0.5">
          <div class="flex items-center justify-center gap-0.5">
            <UInput
              v-model.number="localCadence"
              type="number"
              size="xs"
              variant="none"
              placeholder="--"
              class="w-12 p-0 text-blue-500 font-black text-center text-sm"
              ui="{ padding: { xs: 'px-0 py-0' } }"
              @update:model-value="emitUpdate"
            />
            <span class="text-[9px] text-blue-400 uppercase font-bold tracking-tight">RPM</span>
          </div>
        </div>

        <!-- Col 4: Duration -->
        <div class="text-right pt-0.5">
          <div class="flex items-center justify-end gap-1">
            <UInput
              v-model.number="localDurationMin"
              type="number"
              size="xs"
              variant="none"
              class="w-14 p-0 text-right text-muted font-bold text-[10px]"
              ui="{ padding: { xs: 'px-0 py-0' } }"
              @update:model-value="emitUpdate"
            />
            <span class="text-[8px] text-gray-400 uppercase font-bold">MIN</span>
          </div>
        </div>

        <!-- Col 5: Power -->
        <div class="text-right pt-0.5">
          <div class="flex items-center justify-end gap-1">
            <div class="flex flex-col items-end">
              <div class="flex items-center gap-1">
                <UInput
                  v-model.number="localPowerStart"
                  type="number"
                  size="xs"
                  variant="none"
                  class="w-14 p-0 text-right font-black text-sm"
                  ui="{ padding: { xs: 'px-0 py-0' } }"
                  @update:model-value="emitUpdate"
                />
                <template v-if="localIsRamp || localPowerStart !== localPowerEnd">
                  <span class="text-[9px] text-gray-400 font-bold">-</span>
                  <UInput
                    v-model.number="localPowerEnd"
                    type="number"
                    size="xs"
                    variant="none"
                    class="w-14 p-0 text-right font-black text-sm"
                    ui="{ padding: { xs: 'px-0 py-0' } }"
                    @update:model-value="emitUpdate"
                  />
                </template>
                <span class="text-[9px] text-gray-400 uppercase font-black">%</span>
              </div>
              <UButton
                v-if="localType !== 'Rest'"
                variant="none"
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

        <!-- Col 6: Avg Watts -->
        <div class="text-right pt-0.5">
          <div class="text-sm font-black text-primary tabular-nums">
            {{ avgWatts }}<span class="text-[9px] ml-0.5 opacity-60">W</span>
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
              ui="{ padding: { sm: 'px-0 py-0' } }"
              @update:model-value="emitUpdate"
            />
          </div>
          <div class="flex items-center gap-2">
            <UInput
              v-model.number="localDurationMin"
              type="number"
              size="xs"
              variant="none"
              class="w-14 p-0 text-right font-black"
              ui="{ padding: { xs: 'px-0 py-0' } }"
              @update:model-value="emitUpdate"
            />
            <span class="text-[9px] text-gray-400 font-bold">MIN</span>
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-heroicons-trash"
              @click="$emit('remove')"
            />
          </div>
        </div>
        <div class="flex items-center gap-4 pl-4.5">
          <USelect
            v-model="localType"
            :items="['Warmup', 'Active', 'Rest', 'Cooldown']"
            size="xs"
            class="w-24"
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
              ui="{ padding: { xs: 'px-0 py-0' } }"
              @update:model-value="emitUpdate"
            />
          </div>
          <div class="flex flex-col items-center gap-0.5">
            <div class="flex items-center gap-1">
              <UInput
                v-model.number="localPowerStart"
                type="number"
                size="xs"
                class="w-12 text-center font-black"
                @update:model-value="emitUpdate"
              />
              <template v-if="localIsRamp || localPowerStart !== localPowerEnd">
                <span class="text-[9px] text-gray-400">-</span>
                <UInput
                  v-model.number="localPowerEnd"
                  type="number"
                  size="xs"
                  class="w-12 text-center font-black"
                  @update:model-value="emitUpdate"
                />
              </template>
              <span class="text-[9px] text-gray-400 font-bold">%</span>
            </div>
            <UButton
              v-if="localType !== 'Rest'"
              variant="none"
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
            <span class="text-[9px] text-blue-400 font-bold uppercase">RPM</span>
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

  // Local state for all editable fields to ensure reactivity and clean data flow
  const localName = ref(props.step.name || '')
  const localType = ref(props.step.type || 'Active')
  const localDurationMin = ref(props.step._durationMin || 0)
  const localPowerStart = ref(props.step._powerStartPct || 0)
  const localPowerEnd = ref(props.step._powerEndPct || 0)
  const localIsRamp = ref(!!props.step._isRamp)
  const localCadence = ref(props.step.cadence || null)
  const localReps = ref(props.step.reps || 1)

  // Watch for external changes (like scaling)
  watch(
    () => props.step,
    (newStep) => {
      localName.value = newStep.name || ''
      localType.value = newStep.type || 'Active'
      localDurationMin.value = newStep._durationMin || 0
      localPowerStart.value = newStep._powerStartPct || 0
      localPowerEnd.value = newStep._powerEndPct || 0
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

  const zoneName = computed(() => {
    const power = localIsRamp.value
      ? (localPowerStart.value + localPowerEnd.value) / 200
      : localPowerStart.value / 100

    if (props.sportSettings?.powerZones && props.sportSettings.ftp) {
      const ftp = props.sportSettings.ftp
      const absPower = power * ftp
      const idx = props.sportSettings.powerZones.findIndex((z: any) => absPower <= z.max)
      return idx !== -1 ? `Z${idx + 1}` : 'Z?'
    }

    if (power <= 0.55) return 'Z1'
    else if (power <= 0.75) return 'Z2'
    else if (power <= 0.9) return 'Z3'
    else if (power <= 1.05) return 'Z4'
    else if (power <= 1.2) return 'Z5'
    return 'Z6'
  })

  const stepColor = computed(() => {
    const power = localIsRamp.value
      ? (localPowerStart.value + localPowerEnd.value) / 200
      : localPowerStart.value / 100
    let colorIdx = 0
    if (power <= 0.55) colorIdx = 0
    else if (power <= 0.75) colorIdx = 1
    else if (power <= 0.9) colorIdx = 2
    else if (power <= 1.05) colorIdx = 3
    else if (power <= 1.2) colorIdx = 4
    else colorIdx = 5

    return ZONE_COLORS[colorIdx] || '#9ca3af'
  })

  const avgWatts = computed(() => {
    if (!props.userFtp) return '-'
    const power = localIsRamp.value
      ? (localPowerStart.value + localPowerEnd.value) / 200
      : localPowerStart.value / 100
    return Math.round(power * props.userFtp)
  })

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
    updatedStep._powerStartPct = localPowerStart.value
    updatedStep._powerEndPct = localPowerEnd.value
    updatedStep._isRamp = localIsRamp.value

    // Power object for chart and backend
    if (!updatedStep.power) updatedStep.power = { units: '%' }
    if (localIsRamp.value || localPowerStart.value !== localPowerEnd.value) {
      updatedStep.power.range = {
        start: localPowerStart.value / 100,
        end: localPowerEnd.value / 100
      }
      updatedStep.power.ramp = localIsRamp.value
      delete updatedStep.power.value
    } else {
      updatedStep.power.value = localPowerStart.value / 100
      delete updatedStep.power.range
      delete updatedStep.power.ramp
    }

    emit('update:step', updatedStep)
    emit('update:duration') // Trigger chart refresh
  }

  function toggleRamp() {
    localIsRamp.value = !localIsRamp.value
    if (!localIsRamp.value) {
      localPowerEnd.value = localPowerStart.value
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

    updatedChild.steps = [
      ...updatedChild.steps,
      {
        uid: Math.random().toString(36).substring(7),
        type: 'Active',
        name: 'Interval',
        durationSeconds: 60,
        duration: 60,
        _durationMin: 1,
        power: { value: 1.0, units: '%' },
        _powerStartPct: 100,
        _powerEndPct: 100,
        _isRamp: false
      }
    ]

    // Find index of this child to update it via updateChildStep or similar logic
    const idx = props.step.steps.findIndex((s: any) => s.uid === child.uid)
    if (idx !== -1) {
      updateChildStep(idx, updatedChild)
    }
  }

  function addStepAfterNested(idx: number) {
    const updatedStep = { ...props.step }
    updatedStep.steps = [...props.step.steps]
    updatedStep.steps.splice(idx + 1, 0, {
      uid: Math.random().toString(36).substring(7),
      type: 'Active',
      name: 'New Step',
      durationSeconds: 300,
      duration: 300,
      _durationMin: 5,
      power: { value: 0.7, units: '%' },
      _powerStartPct: 70,
      _powerEndPct: 70,
      _isRamp: false
    })
    emit('update:step', updatedStep)
    emit('update:duration')
  }
</script>
