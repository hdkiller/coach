<template>
  <div class="space-y-6">
    <!-- Header with Scaling & Metric Selection -->
    <div
      class="bg-gray-50 dark:bg-gray-950 p-4 rounded-xl border border-gray-100 dark:border-gray-800"
    >
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div class="flex flex-col">
          <span class="text-[10px] font-black uppercase tracking-widest text-gray-400"
            >Duration Scaling</span
          >
          <span class="text-sm font-bold text-primary">{{ formatDuration(totalDuration) }}</span>
        </div>

        <!-- Metric Toggle -->
        <div class="flex items-center gap-2">
          <span class="text-[9px] font-black uppercase tracking-widest text-gray-400"
            >Editing:</span
          >
          <USelect
            v-model="activeMetric"
            :items="[
              { label: 'Power (% FTP)', value: 'power' },
              { label: 'Heart Rate (% LTHR)', value: 'hr' },
              { label: 'Pace (% Threshold)', value: 'pace' }
            ]"
            size="xs"
            class="w-36"
          />
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
              :metric="activeMetric"
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
    preference?: 'hr' | 'power' | 'pace'
  }>()

  const emit = defineEmits(['save', 'cancel', 'update:steps'])

  const activeMetric = ref<'power' | 'hr' | 'pace'>(
    props.preference || detectBestMetric(props.steps)
  )

  function detectBestMetric(steps: any[]): 'power' | 'hr' | 'pace' {
    for (const step of steps) {
      if (step.heartRate) return 'hr'
      if (step.power) return 'power'
      if (step.pace) return 'pace'
      if (step.steps) {
        const nested = detectBestMetric(step.steps)
        if (nested) return nested
      }
    }
    return 'power'
  }

  watch(
    () => props.preference,
    (newPref) => {
      if (newPref) activeMetric.value = newPref
    }
  )
  const durationFactor = ref(1)
  const originalSteps = ref<any[]>([])
  const editedSteps = ref<any[]>([])

  function generateUid() {
    return Math.random().toString(36).substring(7)
  }

  function resolveIntensityPct(target: any, metric: 'power' | 'hr' | 'pace'): number {
    if (!target) return 0
    const val = target.value ?? 0
    const units = String(target.units || '').toLowerCase()

    // Handle zone-based targets
    if (units.includes('zone')) {
      const zoneIdx = Math.max(1, Math.round(val)) - 1
      let zones = []
      let refValue = 0

      if (metric === 'power') {
        zones = props.sportSettings?.powerZones || []
        refValue = props.sportSettings?.ftp || props.userFtp || 0
      } else if (metric === 'hr') {
        zones = props.sportSettings?.hrZones || []
        refValue = props.sportSettings?.lthr || 0
      } else {
        zones = props.sportSettings?.paceZones || []
        refValue = props.sportSettings?.thresholdPace || 0
      }

      const zone = zones[zoneIdx]
      if (zone && refValue > 0) {
        const midpoint = (Number(zone.min) + Number(zone.max)) / 2
        return Math.round((midpoint / refValue) * 100)
      }

      // Fallback midpoints if zones missing
      const fallbacks = [0.5, 0.65, 0.82, 0.97, 1.12, 1.3]
      return Math.round((fallbacks[zoneIdx] || 0.75) * 100)
    }

    // Handle absolute values (W, BPM, m/s)
    if (units === 'w' || units === 'watts') {
      const ftp = props.sportSettings?.ftp || props.userFtp || 0
      return ftp > 0 ? Math.round((val / ftp) * 100) : val
    }
    if (units === 'bpm') {
      const lthr = props.sportSettings?.lthr || 0
      return lthr > 0 ? Math.round((val / lthr) * 100) : val
    }
    if (units === 'm/s') {
      const threshold = props.sportSettings?.thresholdPace || 0
      return threshold > 0 ? Math.round((val / threshold) * 100) : val
    }

    // Default: assume it's already a ratio (0.75) or percentage (75)
    // If val is 1, it's very likely a ratio (100%) or a zone that missed the units check.
    // However, if we are in this default block, we treat 1 as 100%.
    return val > 3 ? Math.round(val) : Math.round(val * 100)
  }

  function getTargetForMetric(step: any, metric: 'power' | 'hr' | 'pace') {
    if (metric === 'power') return step.power
    if (metric === 'hr') return step.heartRate
    return step.pace
  }

  function initializeSteps(sourceSteps: any[]) {
    return sourceSteps.map((step) => {
      const s = JSON.parse(JSON.stringify(step)) // Deep copy
      if (!s.uid) s.uid = generateUid()
      const dur = s.durationSeconds || s.duration || 0
      s._durationMin = Math.round(dur / 60)

      const target = getTargetForMetric(s, activeMetric.value)

      if (target?.range) {
        s._intensityStartPct = resolveIntensityPct(
          { ...target, value: target.range.start },
          activeMetric.value
        )
        s._intensityEndPct = resolveIntensityPct(
          { ...target, value: target.range.end },
          activeMetric.value
        )
        s._isRamp = target.ramp !== false
      } else {
        s._intensityStartPct = resolveIntensityPct(target, activeMetric.value)
        s._intensityEndPct = s._intensityStartPct
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
        if (durationFactor.value === 1) {
          editedSteps.value = initializeSteps(originalSteps.value)
        }
      }
    },
    { deep: true }
  )

  // Re-initialize steps when metric changes to update internal start/end percentages
  watch(activeMetric, (newMetric) => {
    // Migrate currently edited steps to the new metric, carrying over the percentage values
    editedSteps.value = migrateStepsToMetric(editedSteps.value, newMetric)

    // Also update originalSteps to match the new metric, ensuring Reset and Scaling work as expected
    originalSteps.value = migrateStepsToMetric(originalSteps.value, newMetric)

    // Also re-apply scaling if active
    if (durationFactor.value !== 1) {
      applyScaling()
    }
  })

  function migrateStepsToMetric(steps: any[], metric: 'power' | 'hr' | 'pace'): any[] {
    return steps.map((s) => {
      const news = JSON.parse(JSON.stringify(s))

      // news already has _intensityStartPct and _intensityEndPct from previous edits or initialization
      // We use these numbers to build the new target object
      const start = (news._intensityStartPct || 0) / 100
      const end = (news._intensityEndPct || 0) / 100
      const isRamp = !!news._isRamp

      const target: any = {}
      if (isRamp || start !== end) {
        target.range = { start, end }
        target.ramp = isRamp
      } else {
        target.value = start
      }

      // Update the correct metric object and CLEAR others to match StepRow logic
      if (metric === 'power') {
        news.power = { ...target, units: '%' }
        delete news.heartRate
        delete news.pace
        news.primaryTarget = 'power'
      } else if (metric === 'hr') {
        news.heartRate = { ...target, units: 'LTHR' }
        delete news.power
        delete news.pace
        news.primaryTarget = 'heartRate'
      } else {
        news.pace = { ...target, units: 'Pace' }
        delete news.power
        delete news.heartRate
        news.primaryTarget = 'pace'
      }

      if (news.steps) news.steps = migrateStepsToMetric(news.steps, metric)
      return news
    })
  }

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

      // Initialize internal intensity fields based on selected metric
      const target = getTargetForMetric(s, activeMetric.value)
      if (target?.range) {
        news._intensityStartPct = resolveIntensityPct(
          { ...target, value: target.range.start },
          activeMetric.value
        )
        news._intensityEndPct = resolveIntensityPct(
          { ...target, value: target.range.end },
          activeMetric.value
        )
        news._isRamp = target.ramp !== false
      } else {
        news._intensityStartPct = resolveIntensityPct(target, activeMetric.value)
        news._intensityEndPct = news._intensityStartPct
        news._isRamp = false
      }

      if (s.steps) news.steps = scaleStepsRecursive(s.steps, factor)
      return news
    })
  }

  function updateStep(idx: number, updatedStep: any) {
    editedSteps.value[idx] = updatedStep
    if (durationFactor.value === 1) {
      originalSteps.value[idx] = JSON.parse(JSON.stringify(updatedStep))
    }
  }

  function createNewStep(name = 'New Step'): any {
    const baseStep = {
      uid: generateUid(),
      type: 'Active',
      name,
      durationSeconds: 300,
      duration: 300,
      _durationMin: 5,
      _intensityStartPct: 70,
      _intensityEndPct: 70,
      _isRamp: false
    }

    const target: any = { value: 0.7 }
    if (activeMetric.value === 'power') {
      return { ...baseStep, power: { ...target, units: '%' } }
    } else if (activeMetric.value === 'hr') {
      return { ...baseStep, heartRate: { ...target, units: 'LTHR' } }
    } else {
      return { ...baseStep, pace: { ...target, units: 'Pace' } }
    }
  }

  function addStep() {
    const newStep = createNewStep()
    editedSteps.value.push(newStep)
    if (durationFactor.value === 1) {
      originalSteps.value.push(JSON.parse(JSON.stringify(newStep)))
    }
  }

  function addStepAfter(idx: number) {
    const newStep = createNewStep()
    editedSteps.value.splice(idx + 1, 0, newStep)
    if (durationFactor.value === 1) {
      originalSteps.value.splice(idx + 1, 0, JSON.parse(JSON.stringify(newStep)))
    }
  }

  function addNestedStep(parent: any) {
    if (!parent.steps) parent.steps = []
    if (!parent.reps) parent.reps = 2
    const newStep = createNewStep('Interval')
    newStep.durationSeconds = 60
    newStep.duration = 60
    newStep._durationMin = 1
    newStep._intensityStartPct = 100
    newStep._intensityEndPct = 100

    // Update metric specific target to 100%
    if (activeMetric.value === 'power') newStep.power.value = 1.0
    else if (activeMetric.value === 'hr') newStep.heartRate.value = 1.0
    else newStep.pace.value = 1.0

    parent.steps.push(newStep)
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
      // Note: We KEEP 'uid' now as it's used by the chart for interaction
      const { _durationMin, _intensityStartPct, _intensityEndPct, _isRamp, ...rest } = s
      const cleaned: any = { ...rest }
      if (cleaned.steps) cleaned.steps = cleanForOutput(cleaned.steps)
      return cleaned
    })
  }

  function saveChanges() {
    const cleaned = cleanForOutput(editedSteps.value)
    console.log('[StepsEditor] Saving steps. Sample:', cleaned[0])
    emit('save', cleaned)
  }

  function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }
</script>
