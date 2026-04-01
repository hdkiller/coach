<template>
  <div class="space-y-5">
    <div class="rounded-xl border border-primary/15 bg-primary/5 p-4">
      <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="text-sm font-semibold text-highlighted">Edit Strength Routine</div>
          <div class="text-sm text-muted">
            Organize the session into sections and tune each exercise’s prescription.
          </div>
        </div>
        <div class="text-xs uppercase tracking-wider text-muted">
          {{ totalExerciseCount }} exercise{{ totalExerciseCount === 1 ? '' : 's' }}
        </div>
      </div>
    </div>

    <div
      v-for="(group, groupIndex) in localGroups"
      :key="group.id"
      class="overflow-hidden rounded-2xl border border-default/70 bg-default/70 shadow-sm"
    >
      <div class="border-b border-default/70 bg-muted/20 px-4 py-3 sm:px-5">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex-1">
            <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted mb-1.5">
              Section
            </div>
            <UInput v-model="group.name" placeholder="Main Lifts" size="lg" class="max-w-md" />
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton size="xs" color="neutral" variant="soft" @click="moveGroup(groupIndex, -1)">
              Up
            </UButton>
            <UButton size="xs" color="neutral" variant="soft" @click="moveGroup(groupIndex, 1)">
              Down
            </UButton>
            <UButton size="xs" color="primary" variant="soft" @click="addExercise(groupIndex)">
              Add Exercise
            </UButton>
            <UButton
              size="xs"
              color="error"
              variant="ghost"
              :disabled="localGroups.length === 1"
              @click="removeGroup(groupIndex)"
            >
              Delete Section
            </UButton>
          </div>
        </div>
      </div>

      <div v-if="group.exercises.length" class="space-y-3 p-4 sm:p-5">
        <div
          v-for="(exercise, exerciseIndex) in group.exercises"
          :key="exercise._id"
          class="rounded-xl border border-default/70 bg-default p-4 shadow-sm"
        >
          <div
            class="mb-4 flex flex-col gap-3 border-b border-default/70 pb-3 sm:flex-row sm:items-start sm:justify-between"
          >
            <div class="space-y-1">
              <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                Exercise {{ exerciseIndex + 1 }}
              </div>
              <div class="text-sm text-muted">{{ group.name || 'Routine' }} section</div>
            </div>
            <div class="flex flex-wrap gap-2">
              <UButton
                size="xs"
                color="neutral"
                variant="soft"
                @click="moveExercise(groupIndex, exerciseIndex, -1)"
              >
                Up
              </UButton>
              <UButton
                size="xs"
                color="neutral"
                variant="soft"
                @click="moveExercise(groupIndex, exerciseIndex, 1)"
              >
                Down
              </UButton>
              <UButton
                size="xs"
                color="error"
                variant="ghost"
                @click="removeExercise(groupIndex, exerciseIndex)"
              >
                Delete
              </UButton>
            </div>
          </div>

          <div class="space-y-4">
            <div class="grid gap-4 xl:grid-cols-12">
              <div class="xl:col-span-8">
                <div class="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Exercise Name
                </div>
                <UInput v-model="exercise.name" placeholder="Back Squat" size="lg" />
              </div>
              <div class="xl:col-span-4">
                <div class="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Movement Pattern
                </div>
                <USelect
                  :model-value="selectValue(exercise.movementPattern)"
                  :items="movementPatternOptions"
                  placeholder="Choose movement pattern"
                  class="w-full"
                  @update:model-value="updateMovementPattern(exercise, $event)"
                />
              </div>
            </div>

            <div class="rounded-xl border border-default/70 bg-muted/10 p-4">
              <div class="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                Prescription
              </div>
              <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div>
                  <div
                    class="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
                  >
                    Sets
                  </div>
                  <UInput v-model.number="exercise.sets" type="number" min="1" />
                </div>
                <div>
                  <div
                    class="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
                  >
                    Reps
                  </div>
                  <UInput v-model="exercise.reps" placeholder="5" />
                </div>
                <div>
                  <div
                    class="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
                  >
                    Weight
                  </div>
                  <UInput v-model="exercise.weight" placeholder="75% 1RM" />
                </div>
                <div>
                  <div
                    class="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
                  >
                    Rest
                  </div>
                  <UInput v-model="exercise.rest" placeholder="90s" />
                </div>
                <div>
                  <div
                    class="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
                  >
                    RPE
                  </div>
                  <UInput v-model.number="exercise.rpe" type="number" min="1" max="10" step="0.5" />
                </div>
              </div>
            </div>

            <div class="grid gap-4 xl:grid-cols-12">
              <div class="xl:col-span-4">
                <div class="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Intent
                </div>
                <USelect
                  :model-value="selectValue(exercise.intent)"
                  :items="intentOptions"
                  placeholder="Choose intent"
                  @update:model-value="updateIntent(exercise, $event)"
                />
              </div>
              <div class="xl:col-span-3">
                <div class="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Duration (s)
                </div>
                <UInput v-model.number="exercise.duration" type="number" min="0" />
              </div>
              <div class="xl:col-span-5">
                <div class="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Coach Notes
                </div>
                <UTextarea
                  v-model="exercise.notes"
                  :rows="3"
                  autoresize
                  class="w-full"
                  placeholder="Tempo, cues, setup, substitutions..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-else
        class="m-4 rounded-xl border border-dashed border-default/70 bg-muted/10 p-5 text-sm text-muted sm:m-5"
      >
        No exercises in this section yet.
      </div>
    </div>

    <div
      class="sticky bottom-0 flex flex-col gap-3 rounded-xl border border-default/70 bg-default/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between"
    >
      <UButton color="primary" variant="soft" icon="i-heroicons-plus" size="lg" @click="addGroup">
        Add Section
      </UButton>
      <div class="flex gap-2">
        <UButton color="neutral" variant="ghost" size="lg" @click="$emit('cancel')">Cancel</UButton>
        <UButton color="primary" size="lg" @click="saveChanges">Save Routine</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import {
    flattenStrengthExerciseGroups,
    groupStrengthExercises,
    type StrengthExerciseGroup
  } from '~/utils/strengthWorkout'

  const props = defineProps<{
    exercises: any[]
  }>()

  const emit = defineEmits(['save', 'cancel'])

  const EMPTY_SELECT_VALUE = '__none__'

  const intentOptions = [
    { label: 'No specific intent', value: EMPTY_SELECT_VALUE },
    { label: 'Max Strength', value: 'max_strength' },
    { label: 'Power', value: 'power' },
    { label: 'Muscular Endurance', value: 'muscular_endurance' },
    { label: 'Prehab', value: 'prehab' }
  ]

  const movementPatternOptions = [
    { label: 'No specific pattern', value: EMPTY_SELECT_VALUE },
    { label: 'Squat', value: 'squat' },
    { label: 'Hinge', value: 'hinge' },
    { label: 'Push', value: 'push' },
    { label: 'Pull', value: 'pull' },
    { label: 'Lunge', value: 'lunge' },
    { label: 'Core', value: 'core' },
    { label: 'Carry', value: 'carry' },
    { label: 'Mobility', value: 'mobility' }
  ]

  const localGroups = ref<StrengthExerciseGroup[]>([])
  const totalExerciseCount = computed(() =>
    localGroups.value.reduce((sum, group) => sum + group.exercises.length, 0)
  )

  function createGroup(name = 'Routine'): StrengthExerciseGroup {
    return {
      id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      exercises: []
    }
  }

  function createExercise() {
    return {
      _id: `exercise-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: '',
      sets: 3,
      reps: '',
      weight: '',
      duration: undefined,
      rest: '',
      notes: '',
      intent: '',
      movementPattern: '',
      rpe: undefined
    }
  }

  function resetFromProps() {
    localGroups.value = groupStrengthExercises(props.exercises)
  }

  watch(() => props.exercises, resetFromProps, { immediate: true, deep: true })

  function addGroup() {
    localGroups.value.push(createGroup(`Section ${localGroups.value.length + 1}`))
  }

  function removeGroup(index: number) {
    if (localGroups.value.length === 1) {
      localGroups.value[0] = createGroup(localGroups.value[0]?.name || 'Routine')
      return
    }
    localGroups.value.splice(index, 1)
  }

  function moveGroup(index: number, direction: number) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= localGroups.value.length) return
    const [group] = localGroups.value.splice(index, 1)
    localGroups.value.splice(targetIndex, 0, group)
  }

  function addExercise(groupIndex: number) {
    localGroups.value[groupIndex]?.exercises.push(createExercise())
  }

  function selectValue(value: unknown) {
    const normalized = String(value || '').trim()
    return normalized || EMPTY_SELECT_VALUE
  }

  function normalizeSelectValue(value: unknown) {
    const normalized = String(value || '').trim()
    return normalized === EMPTY_SELECT_VALUE ? '' : normalized
  }

  function updateIntent(exercise: any, value: unknown) {
    exercise.intent = normalizeSelectValue(value)
  }

  function updateMovementPattern(exercise: any, value: unknown) {
    exercise.movementPattern = normalizeSelectValue(value)
  }

  function removeExercise(groupIndex: number, exerciseIndex: number) {
    localGroups.value[groupIndex]?.exercises.splice(exerciseIndex, 1)
  }

  function moveExercise(groupIndex: number, exerciseIndex: number, direction: number) {
    const exercises = localGroups.value[groupIndex]?.exercises
    if (!exercises) return
    const targetIndex = exerciseIndex + direction
    if (targetIndex < 0 || targetIndex >= exercises.length) return
    const [exercise] = exercises.splice(exerciseIndex, 1)
    exercises.splice(targetIndex, 0, exercise)
  }

  function cleanExercise(exercise: any) {
    const cleaned: Record<string, any> = {
      name: String(exercise?.name || '').trim()
    }

    if (!cleaned.name) return null

    if (Number.isFinite(Number(exercise?.sets)) && Number(exercise.sets) > 0) {
      cleaned.sets = Math.trunc(Number(exercise.sets))
    }
    if (String(exercise?.reps || '').trim()) cleaned.reps = String(exercise.reps).trim()
    if (String(exercise?.weight || '').trim()) cleaned.weight = String(exercise.weight).trim()
    if (Number.isFinite(Number(exercise?.duration)) && Number(exercise.duration) > 0) {
      cleaned.duration = Math.trunc(Number(exercise.duration))
    }
    if (String(exercise?.rest || '').trim()) cleaned.rest = String(exercise.rest).trim()
    if (String(exercise?.notes || '').trim()) cleaned.notes = String(exercise.notes).trim()
    if (String(exercise?.intent || '').trim()) cleaned.intent = String(exercise.intent).trim()
    if (String(exercise?.movementPattern || '').trim()) {
      cleaned.movementPattern = String(exercise.movementPattern).trim()
    }
    if (Number.isFinite(Number(exercise?.rpe)) && Number(exercise.rpe) > 0) {
      cleaned.rpe = Number(exercise.rpe)
    }

    return cleaned
  }

  function saveChanges() {
    const normalizedGroups = localGroups.value
      .map((group) => ({
        ...group,
        name: String(group.name || '').trim() || 'Routine',
        exercises: group.exercises.map(cleanExercise).filter(Boolean)
      }))
      .filter((group) => group.exercises.length > 0 || localGroups.value.length === 1)

    emit('save', flattenStrengthExerciseGroups(normalizedGroups))
  }
</script>
