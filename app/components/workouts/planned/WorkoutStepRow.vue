<template>
  <div class="space-y-1">
    <div
      class="bg-white dark:bg-gray-900 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors group relative"
    >
      <!-- Desktop Layout -->
      <div
        class="hidden sm:grid items-center gap-4 grid-cols-[32px_12px_1fr_54px_90px_80px_140px_70px_32px]"
      >
        <!-- Col 0: Drag Handle -->
        <div
          class="flex items-center justify-center cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 drag-handle"
        >
          <UIcon name="i-heroicons-bars-2" class="w-4 h-4" />
        </div>

        <!-- Col 1: Dot -->
        <div
          class="w-3 h-3 rounded-full flex-shrink-0 mt-1"
          :style="{ backgroundColor: stepColor }"
        />

        <!-- Col 2: Name & Type -->
        <div class="min-w-0" :style="indentStyle">
          <UInput
            v-model="step.name"
            placeholder="Step Name"
            size="xs"
            variant="none"
            class="p-0 font-bold placeholder:italic hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors focus:bg-white dark:focus:bg-gray-950"
            ui="{ padding: { xs: 'px-1 py-0.5' } }"
          />
          <div class="flex items-center gap-1.5 mt-0.5">
            <USelect
              v-model="step.type"
              :items="['Warmup', 'Active', 'Rest', 'Cooldown']"
              size="xs"
              variant="none"
              class="p-0 text-muted uppercase text-[9px] font-black tracking-widest w-20"
              ui="{ padding: { xs: 'px-0 py-0' } }"
            />
            <div v-if="hasNestedSteps" class="flex items-center gap-1">
              <span class="text-[9px] text-gray-400 font-bold uppercase">x</span>
              <UInput
                v-model.number="step.reps"
                type="number"
                size="xs"
                variant="none"
                class="w-14 p-0 font-black text-primary text-[10px]"
                ui="{ padding: { xs: 'px-0 py-0' } }"
              />
            </div>
          </div>
        </div>

        <!-- Col 3: Zone -->
        <div class="text-center text-sm font-black text-gray-500 dark:text-gray-400 tabular-nums">
          {{ zoneName }}
        </div>

        <!-- Col 4: Cadence -->
        <div class="text-center">
          <div class="flex items-center justify-center gap-0.5">
            <UInput
              v-model.number="step.cadence"
              type="number"
              size="xs"
              variant="none"
              placeholder="--"
              class="w-12 p-0 text-blue-500 font-black text-center text-sm"
              ui="{ padding: { xs: 'px-0 py-0' } }"
            />
            <span class="text-[9px] text-blue-400 uppercase font-bold tracking-tight">RPM</span>
          </div>
        </div>

        <!-- Col 5: Duration -->
        <div class="text-right">
          <div class="flex items-center justify-end gap-1">
            <UInput
              v-model.number="step._durationMin"
              type="number"
              size="xs"
              variant="none"
              class="w-14 p-0 text-right text-muted font-bold text-[10px]"
              ui="{ padding: { xs: 'px-0 py-0' } }"
              @update:model-value="$emit('update:duration')"
            />
            <span class="text-[8px] text-gray-400 uppercase font-bold">MIN</span>
          </div>
        </div>

        <!-- Col 6: Power (Ramp Support) -->
        <div class="text-right">
          <div class="flex items-center justify-end gap-1">
            <div class="flex flex-col items-end">
              <div class="flex items-center gap-1">
                <UInput
                  v-model.number="step._powerStartPct"
                  type="number"
                  size="xs"
                  variant="none"
                  class="w-12 p-0 text-right font-black text-sm"
                  ui="{ padding: { xs: 'px-0 py-0' } }"
                  @update:model-value="updatePower"
                />
                <template v-if="step._isRamp || step._powerStartPct !== step._powerEndPct">
                  <span class="text-[9px] text-gray-400 font-bold">-</span>
                  <UInput
                    v-model.number="step._powerEndPct"
                    type="number"
                    size="xs"
                    variant="none"
                    class="w-12 p-0 text-right font-black text-sm"
                    ui="{ padding: { xs: 'px-0 py-0' } }"
                    @update:model-value="updatePower"
                  />
                </template>
                <span class="text-[9px] text-gray-400 uppercase font-black">%</span>
              </div>
              <UButton
                v-if="step.type !== 'Rest'"
                variant="none"
                size="xs"
                class="p-0 h-auto text-[8px] font-black uppercase tracking-tighter"
                :color="step._isRamp ? 'primary' : 'neutral'"
                @click="toggleRamp"
              >
                {{ step._isRamp ? 'Ramp On' : 'Set Ramp' }}
              </UButton>
            </div>
          </div>
        </div>

        <!-- Col 7: Avg Watts -->
        <div class="text-right">
          <div class="text-sm font-black text-primary tabular-nums">
            {{ avgWatts }}<span class="text-[9px] ml-0.5 opacity-60">W</span>
          </div>
        </div>

        <!-- Col 8: Actions -->
        <div
          class="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity"
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
              v-model="step.name"
              placeholder="Step Name"
              size="sm"
              variant="none"
              class="p-0 font-bold flex-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-1 transition-colors"
              ui="{ padding: { sm: 'px-0 py-0' } }"
            />
          </div>
          <div class="flex items-center gap-2">
            <UInput
              v-model.number="step._durationMin"
              type="number"
              size="xs"
              variant="none"
              class="w-14 p-0 text-right font-black"
              ui="{ padding: { xs: 'px-0 py-0' } }"
              @update:model-value="$emit('update:duration')"
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
            v-model="step.type"
            :items="['Warmup', 'Active', 'Rest', 'Cooldown']"
            size="xs"
            class="w-24"
          />
          <div v-if="hasNestedSteps" class="flex items-center gap-1">
            <span class="text-[9px] text-gray-400 font-bold uppercase">x</span>
            <UInput
              v-model.number="step.reps"
              type="number"
              size="xs"
              variant="none"
              class="w-10 p-0 font-black text-primary text-[10px]"
              ui="{ padding: { xs: 'px-0 py-0' } }"
            />
          </div>
          <div class="flex flex-col items-center gap-0.5">
            <div class="flex items-center gap-1">
              <UInput
                v-model.number="step._powerStartPct"
                type="number"
                size="xs"
                class="w-12 text-center font-black"
                @update:model-value="updatePower"
              />
              <template v-if="step._isRamp">
                <span class="text-[9px] text-gray-400">-</span>
                <UInput
                  v-model.number="step._powerEndPct"
                  type="number"
                  size="xs"
                  class="w-12 text-center font-black"
                  @update:model-value="updatePower"
                />
              </template>
              <span class="text-[9px] text-gray-400 font-bold">%</span>
            </div>
            <UButton
              v-if="step.type !== 'Rest'"
              variant="none"
              size="xs"
              class="p-0 h-auto text-[8px] font-black uppercase"
              :color="step._isRamp ? 'primary' : 'neutral'"
              @click="toggleRamp"
            >
              {{ step._isRamp ? 'Ramp' : '+ Ramp' }}
            </UButton>
          </div>
          <div class="flex items-center gap-1">
            <UInput
              v-model.number="step.cadence"
              type="number"
              size="xs"
              class="w-16 text-center font-black text-blue-500"
            />
            <span class="text-[9px] text-blue-400 font-bold uppercase">RPM</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Nested Steps -->
    <div v-if="hasNestedSteps" class="ml-2 border-l border-primary-500/20 pl-2 mt-1 space-y-1">
      <draggable
        v-model="step.steps"
        item-key="uid"
        handle=".drag-handle"
        ghost-class="opacity-50"
        @change="$emit('update:duration')"
      >
        <template #item="{ element: child, index: cIdx }">
          <WorkoutStepRow
            v-model:step="step.steps[cIdx]"
            :index="cIdx"
            :depth="depth + 1"
            :user-ftp="userFtp"
            :sport-settings="sportSettings"
            @remove="removeNested(cIdx)"
            @update:duration="$emit('update:duration')"
            @update:power="$emit('update:power')"
            @add-nested="addNestedToChild(child)"
            @add-after="addStepAfterNested(cIdx)"
          />
        </template>
      </draggable>
    </div>
  </div>
</template>

<script setup lang="ts">
  import draggable from 'vuedraggable'
  import { ZONE_COLORS } from '~/utils/zone-colors'

  const step = defineModel<any>('step', { required: true })
  const props = defineProps<{
    index: number
    depth: number
    userFtp?: number
    sportSettings?: any
  }>()

  const emit = defineEmits(['remove', 'update:duration', 'update:power', 'add-nested', 'add-after'])

  const hasNestedSteps = computed(
    () => Array.isArray(step.value.steps) && step.value.steps.length > 0
  )
  const indentStyle = computed(() => ({ paddingLeft: `${Math.min(props.depth, 5) * 8}px` }))

  const stepIntensity = computed(() => {
    return (step.value._powerStartPct || 0) / 100
  })

  const stepEndIntensity = computed(() => {
    return (step.value._powerEndPct || 0) / 100
  })

  const zoneName = computed(() => {
    const power = step.value._isRamp
      ? (stepIntensity.value + stepEndIntensity.value) / 2
      : stepIntensity.value
    // Replicating WorkoutChart logic for zone names
    if (props.sportSettings?.powerZones && props.sportSettings.ftp) {
      const ftp = props.sportSettings.ftp
      const absPower = power * ftp
      const idx = props.sportSettings.powerZones.findIndex((z: any) => absPower <= z.max)
      return idx !== -1 ? `Z${idx + 1}` : 'Z?'
    }

    // Fallback
    if (power <= 0.55) return 'Z1'
    else if (power <= 0.75) return 'Z2'
    else if (power <= 0.9) return 'Z3'
    else if (power <= 1.05) return 'Z4'
    else if (power <= 1.2) return 'Z5'
    return 'Z6'
  })

  const stepColor = computed(() => {
    const power = step.value._isRamp
      ? (stepIntensity.value + stepEndIntensity.value) / 2
      : stepIntensity.value
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
    const power = step.value._isRamp
      ? (stepIntensity.value + stepEndIntensity.value) / 2
      : stepIntensity.value
    return Math.round(power * props.userFtp)
  })

  function removeNested(idx: number) {
    step.value.steps.splice(idx, 1)
    emit('update:duration')
  }

  function addNestedToChild(child: any) {
    if (!child.steps) child.steps = []
    if (!child.reps) child.reps = 2
    child.steps.push({
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
    })
    emit('update:duration')
  }

  function addStepAfterNested(idx: number) {
    step.value.steps.splice(idx + 1, 0, {
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
    emit('update:duration')
  }

  function toggleRamp() {
    step.value._isRamp = !step.value._isRamp
    if (!step.value._isRamp) {
      step.value._powerEndPct = step.value._powerStartPct
    }
    updatePower()
  }

  function updatePower() {
    if (!step.value.power) step.value.power = { units: '%' }

    if (step.value._isRamp || step.value._powerStartPct !== step.value._powerEndPct) {
      step.value.power.range = {
        start: step.value._powerStartPct / 100,
        end: step.value._powerEndPct / 100
      }
      step.value.power.ramp = step.value._isRamp
      delete step.value.power.value
    } else {
      step.value.power.value = step.value._powerStartPct / 100
      delete step.value.power.range
      delete step.value.power.ramp
    }
    emit('update:power')
  }
</script>
