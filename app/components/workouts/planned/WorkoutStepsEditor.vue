<template>
  <div class="space-y-6">
    <!-- Header with Scaling -->
    <div
      class="bg-gray-50 dark:bg-gray-950 p-4 rounded-xl border border-gray-100 dark:border-gray-800"
    >
      <div class="flex items-center justify-between mb-4">
        <div class="flex flex-col">
          <span class="text-[10px] font-black uppercase tracking-widest text-gray-400"
            >Duration Scaling</span
          >
          <span class="text-sm font-bold text-primary">{{ formatDuration(totalDuration) }}</span>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-heroicons-arrow-path"
            class="font-bold uppercase tracking-widest text-[9px]"
            @click="resetSteps"
          >
            Reset
          </UButton>
        </div>
      </div>
      <USlider
        v-model="durationFactor"
        :min="0.5"
        :max="2"
        :step="0.05"
        class="w-full"
        @update:model-value="applyScaling"
      />
      <div class="flex justify-between text-[9px] text-gray-400 mt-1 uppercase font-bold px-1">
        <span>-50%</span>
        <span>Original ({{ Math.round(durationFactor * 100) }}%)</span>
        <span>+100%</span>
      </div>
    </div>

    <!-- Steps Editor List -->
    <div class="space-y-4">
      <div class="flex items-center justify-between px-1">
        <h4 class="text-xs font-black uppercase tracking-widest text-gray-500">Steps Structure</h4>
        <UButton
          color="primary"
          variant="soft"
          size="xs"
          icon="i-heroicons-plus"
          class="font-bold uppercase tracking-widest text-[9px]"
          @click="addStep"
        >
          Add Root Step
        </UButton>
      </div>

      <div class="space-y-1">
        <draggable
          v-model="editedSteps"
          item-key="uid"
          handle=".drag-handle"
          ghost-class="opacity-50"
        >
          <template #item="{ element: step, index }">
            <WorkoutStepRow
              :step="step"
              :index="index"
              :depth="0"
              :user-ftp="userFtp"
              :sport-settings="sportSettings"
              @remove="removeStep(index)"
              @update:step="updateStep(index, $event)"
              @add-nested="addNestedStep(step)"
              @add-after="addStepAfter(index)"
            />
          </template>
        </draggable>
      </div>
    </div>

    <!-- Footer Actions -->
    <div class="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        class="font-bold uppercase tracking-widest text-[10px]"
        @click="$emit('cancel')"
      >
        Cancel
      </UButton>
      <UButton
        color="primary"
        size="sm"
        class="font-black uppercase tracking-widest text-[10px] px-6"
        :loading="saving"
        @click="saveChanges"
      >
        Save Structure
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
  import draggable from 'vuedraggable'
  import WorkoutStepRow from './WorkoutStepRow.vue'

  const props = defineProps<{
    steps: any[]
    userFtp?: number
    sportSettings?: any
    saving?: boolean
  }>()

  const emit = defineEmits(['save', 'cancel', 'update:steps'])

  const durationFactor = ref(1)
  const originalSteps = ref<any[]>([])
  const editedSteps = ref<any[]>([])

  function generateUid() {
    return Math.random().toString(36).substring(7)
  }

  function initializeSteps(sourceSteps: any[]) {
    return sourceSteps.map((step) => {
      const s = JSON.parse(JSON.stringify(step)) // Deep copy
      if (!s.uid) s.uid = generateUid()
      const dur = s.durationSeconds || s.duration || 0
      s._durationMin = Math.round(dur / 60)

      if (s.power?.range) {
        s._powerStartPct = Math.round(s.power.range.start * 100)
        s._powerEndPct = Math.round(s.power.range.end * 100)
        // If range exists but ramp is undefined, assume it's a ramp (backwards compatibility)
        s._isRamp = s.power.ramp !== false
      } else {
        const p = s.power?.value || 0
        s._powerStartPct = Math.round(p * 100)
        s._powerEndPct = s._powerStartPct
        s._isRamp = false
      }

      if (s.steps) s.steps = initializeSteps(s.steps)
      return s
    })
  }

  // Initial load
  originalSteps.value = JSON.parse(JSON.stringify(props.steps))
  editedSteps.value = initializeSteps(originalSteps.value)

  // Watch for external changes if not currently saving
  watch(
    () => props.steps,
    (newSteps) => {
      if (!props.saving) {
        originalSteps.value = JSON.parse(JSON.stringify(newSteps))
        // If we haven't scaled yet, update edited steps too
        if (durationFactor.value === 1) {
          editedSteps.value = initializeSteps(originalSteps.value)
        }
      }
    },
    { deep: true }
  )

  const totalDuration = computed(() => {
    const calc = (steps: any[]): number => {
      return steps.reduce((acc, s) => {
        const reps = s.reps || 1
        if (s.steps && s.steps.length > 0) return acc + calc(s.steps) * reps
        return acc + (s.durationSeconds || s.duration || 0) * reps
      }, 0)
    }
    return calc(editedSteps.value)
  })

  // Watch editedSteps and emit updated structure for live preview
  watch(
    editedSteps,
    (newVal) => {
      emit('update:steps', cleanForOutput(newVal))
    },
    { deep: true }
  )

  function applyScaling() {
    const factor = durationFactor.value
    editedSteps.value = scaleStepsRecursive(originalSteps.value, factor)
  }

  function scaleStepsRecursive(steps: any[], factor: number): any[] {
    return steps.map((s) => {
      const news = JSON.parse(JSON.stringify(s)) // Deep copy
      if (!news.uid) news.uid = generateUid()

      // Scale duration
      if (s.durationSeconds) news.durationSeconds = Math.round(s.durationSeconds * factor)
      if (s.duration) news.duration = Math.round(s.duration * factor)
      if (s.distance) news.distance = Math.round(s.distance * factor)
      news._durationMin = Math.round((news.durationSeconds || news.duration || 0) / 60)

      // Initialize internal power fields (Intensity doesn't scale with duration)
      if (s.power?.range) {
        news._powerStartPct = Math.round(s.power.range.start * 100)
        news._powerEndPct = Math.round(s.power.range.end * 100)
        news._isRamp = s.power.ramp !== false
      } else {
        const p = s.power?.value || 0
        news._powerStartPct = Math.round(p * 100)
        news._powerEndPct = news._powerStartPct
        news._isRamp = false
      }

      if (s.steps) news.steps = scaleStepsRecursive(s.steps, factor)
      return news
    })
  }

  function updateStep(idx: number, updatedStep: any) {
    editedSteps.value[idx] = updatedStep
    // If we are at 100% scaling, update the original baseline too
    // This allows further scaling to be relative to this new manual edit
    if (durationFactor.value === 1) {
      originalSteps.value[idx] = JSON.parse(JSON.stringify(updatedStep))
    }
  }

  function addStep() {
    const newStep = {
      uid: generateUid(),
      type: 'Active',
      name: 'New Step',
      durationSeconds: 300,
      duration: 300,
      _durationMin: 5,
      power: { value: 0.7, units: '%' },
      _powerStartPct: 70,
      _powerEndPct: 70,
      _isRamp: false
    }
    editedSteps.value.push(newStep)
    if (durationFactor.value === 1) {
      originalSteps.value.push(JSON.parse(JSON.stringify(newStep)))
    }
  }

  function addStepAfter(idx: number) {
    const newStep = {
      uid: generateUid(),
      type: 'Active',
      name: 'New Step',
      durationSeconds: 300,
      duration: 300,
      _durationMin: 5,
      power: { value: 0.7, units: '%' },
      _powerStartPct: 70,
      _powerEndPct: 70,
      _isRamp: false
    }
    editedSteps.value.splice(idx + 1, 0, newStep)
    if (durationFactor.value === 1) {
      originalSteps.value.splice(idx + 1, 0, JSON.parse(JSON.stringify(newStep)))
    }
  }

  function addNestedStep(parent: any) {
    if (!parent.steps) parent.steps = []
    if (!parent.reps) parent.reps = 2
    parent.steps.push({
      uid: generateUid(),
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
    // For nested additions, we just update the edited steps.
    // The baseline logic for nested steps is slightly more complex,
    // but updating the parent in originalSteps is handled by updateStep.
  }

  function removeStep(index: number) {
    editedSteps.value.splice(index, 1)
    if (durationFactor.value === 1) {
      originalSteps.value.splice(index, 1)
    }
  }

  function resetSteps() {
    durationFactor.value = 1
    editedSteps.value = initializeSteps(originalSteps.value)
  }

  function cleanForOutput(steps: any[]): any[] {
    return steps.map((s) => {
      // Destructure internal properties to exclude them from output
      const { _durationMin, _powerStartPct, _powerEndPct, _isRamp, uid, ...rest } = s
      const cleaned: any = { ...rest }
      if (cleaned.steps) cleaned.steps = cleanForOutput(cleaned.steps)
      return cleaned
    })
  }

  function saveChanges() {
    emit('save', cleanForOutput(editedSteps.value))
  }

  function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }
</script>
