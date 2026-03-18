<template>
  <div
    :class="[
      'p-4 sm:p-6 transition-colors',
      isBlueprint
        ? 'bg-default/95 border border-default/80 rounded-3xl shadow-sm'
        : 'bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800'
    ]"
  >
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold">Swim Session</h3>
      <div class="flex gap-2">
        <UButton
          size="sm"
          color="neutral"
          variant="ghost"
          icon="i-heroicons-eye"
          @click="$emit('view')"
        >
          View
        </UButton>
        <UButton
          size="sm"
          color="neutral"
          variant="ghost"
          icon="i-heroicons-adjustments-horizontal"
          @click="$emit('adjust')"
        >
          Adjust
        </UButton>
        <UButton
          size="sm"
          color="neutral"
          variant="ghost"
          icon="i-heroicons-pencil-square"
          @click="$emit('edit')"
        >
          Edit
        </UButton>
        <UButton
          size="sm"
          color="neutral"
          variant="ghost"
          icon="i-heroicons-pencil-square"
          :class="{ 'bg-primary-50 dark:bg-primary-900/20 text-primary': activeTab === 'edit' }"
          @click="activeTab = activeTab === 'edit' ? 'view' : 'edit'"
        >
          Edit
        </UButton>
        <UButton
          size="sm"
          color="neutral"
          variant="ghost"
          icon="i-heroicons-arrow-path"
          :loading="generating"
          @click="$emit('regenerate')"
        >
          Regenerate
        </UButton>
      </div>
    </div>

    <div class="space-y-4">
      <div v-if="allowEdit" class="flex justify-end mb-2">
        <UTabs
          v-model="activeTab"
          :items="[
            { label: 'Steps', value: 'view', icon: 'i-heroicons-list-bullet' },
            { label: 'Edit', value: 'edit', icon: 'i-heroicons-pencil-square' }
          ]"
          size="xs"
          :ui="{ list: { width: 'w-auto' } }"
        />
      </div>

      <div v-if="activeTab === 'view' && workout.structuredWorkout?.steps" class="space-y-4">
        <div
          v-for="(step, index) in workout.structuredWorkout.steps"
          :key="index"
          class="flex items-center p-3 bg-gray-50 dark:bg-gray-950 rounded-lg"
        >
          <div
            class="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-900 text-cyan-600 dark:text-cyan-300 flex items-center justify-center font-bold text-sm mr-4"
          >
            {{ Number(index) + 1 }}
          </div>
          <div class="flex-1">
            <div class="font-medium">{{ step.name || step.type }}</div>
            <div class="text-sm text-muted">
              <span v-if="step.distance">{{ step.distance }}m</span>
              <span v-else-if="step.durationSeconds || step.duration">{{
                formatDuration(step.durationSeconds || step.duration)
              }}</span>
              <span class="mx-2">•</span>
              <span>{{ step.description || 'Steady' }}</span>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="activeTab === 'edit'">
        <WorkoutStepsEditor
          :steps="workout.structuredWorkout?.steps || []"
          @save="$emit('save', $event)"
          @cancel="activeTab = 'view'"
        />
      </div>
      <div v-else class="text-center py-8 text-muted">No structured swim steps available.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import WorkoutStepsEditor from './WorkoutStepsEditor.vue'
  const props = defineProps<{
    workout: any
    generating?: boolean
    allowEdit?: boolean
    stepsTab?: 'view' | 'edit'
    isBlueprint?: boolean
  }>()

  const emit = defineEmits(['view', 'adjust', 'regenerate', 'save', 'update:stepsTab'])

  const activeTab = computed({
    get: () => props.stepsTab || 'view',
    set: (val) => emit('update:stepsTab', val)
  })

  function formatDuration(seconds: number) {
    const mins = Math.floor(seconds / 60)
    return `${mins} min`
  }
</script>
