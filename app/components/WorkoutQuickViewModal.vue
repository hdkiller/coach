<template>
  <UModal 
    v-model:open="isOpen" 
    title="Workout Overview"
  >
    <!-- Hidden trigger - modal is controlled programmatically -->
    <span class="hidden"></span>

    <template #body>
      <div v-if="workout" class="space-y-4">
        <!-- Title -->
        <div>
          <h3 class="text-lg font-semibold">{{ workout.title }}</h3>
          <p v-if="workout.description" class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {{ workout.description }}
          </p>
        </div>

        <!-- Planned Workout Badge -->
        <div v-if="workout.plannedWorkoutId" class="flex items-center gap-2">
          <UBadge color="primary" variant="subtle">
            <UIcon name="i-heroicons-calendar" class="w-4 h-4" />
            <span class="ml-1">Completed from Plan</span>
          </UBadge>
        </div>

        <!-- Quick Stats -->
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Type</div>
            <div class="flex items-center gap-2">
              <UIcon :name="getActivityIcon(workout.type)" class="w-4 h-4" />
              <span class="font-medium">{{ workout.type || 'Activity' }}</span>
            </div>
          </div>

          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Date</div>
            <div class="font-medium">{{ formatDate(workout.date) }}</div>
          </div>

          <div v-if="workout.durationSec" class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Duration</div>
            <div class="font-medium">{{ formatDuration(workout.durationSec) }}</div>
          </div>

          <div v-if="workout.distanceMeters" class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Distance</div>
            <div class="font-medium">{{ (workout.distanceMeters / 1000).toFixed(2) }} km</div>
          </div>

          <div v-if="workout.tss" class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">TSS</div>
            <div class="font-medium">{{ Math.round(workout.tss) }}</div>
          </div>

          <div v-if="workout.averageHr" class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg HR</div>
            <div class="font-medium">{{ workout.averageHr }} bpm</div>
          </div>

          <div v-if="workout.averageWatts" class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Power</div>
            <div class="font-medium">{{ workout.averageWatts }} W</div>
          </div>

          <div v-if="workout.rpe" class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">RPE</div>
            <div class="font-medium">{{ workout.rpe }}/10</div>
          </div>
        </div>

        <!-- Source Badge -->
        <div class="flex items-center gap-2">
          <UBadge 
            :color="workout.source === 'manual' ? 'warning' : 'info'" 
            variant="subtle"
            size="xs"
          >
            {{ workout.source.toUpperCase() }}
          </UBadge>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="primary"
          @click="viewFullWorkout"
        >
          View Full Workout
        </UButton>
        <UButton
          variant="outline"
          @click="closeModal"
        >
          Close
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { format } from 'date-fns'

const props = defineProps<{
  workout: any | null
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

function closeModal() {
  isOpen.value = false
}

function viewFullWorkout() {
  if (props.workout) {
    navigateTo(`/workouts/${props.workout.id}`)
  }
}

function formatDate(dateStr: string) {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy h:mm a')
  } catch {
    return dateStr
  }
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  
  if (h > 0) {
    return `${h}h ${m}m`
  }
  return `${m}m`
}

function getActivityIcon(type: string) {
  const t = (type || '').toLowerCase()
  if (t.includes('ride') || t.includes('cycle')) return 'i-heroicons-bolt'
  if (t.includes('run')) return 'i-heroicons-fire'
  if (t.includes('swim')) return 'i-heroicons-beaker'
  if (t.includes('weight') || t.includes('strength')) return 'i-heroicons-trophy'
  return 'i-heroicons-check-circle'
}
</script>