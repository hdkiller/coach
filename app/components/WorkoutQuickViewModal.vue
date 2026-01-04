<template>
  <UModal 
    v-model:open="isOpen" 
    title="Workout Overview"
    description="View detailed statistics for this workout"
  >
    <!-- Custom Header with Delete Button -->
    <template #header>
      <div class="flex items-center justify-between w-full">
        <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
          Workout Overview
        </h3>
        <div class="flex items-center gap-2">
          <UButton
            color="error"
            variant="ghost"
            icon="i-heroicons-trash"
            size="sm"
            @click="showDeleteConfirm = true"
          />
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-x-mark"
            size="sm"
            @click="closeModal"
          />
        </div>
      </div>
    </template>

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

        <!-- Planned Workout Badge & Details -->
        <div v-if="workout.plannedWorkout" class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-100 dark:border-blue-800 relative group">
          <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-heroicons-link-slash"
              :loading="isUnlinking"
              @click="unlinkWorkout"
              title="Unlink from Plan"
            />
          </div>

          <div class="flex items-center justify-between mb-3 pr-8">
            <div class="flex items-center gap-2">
              <UBadge color="primary" variant="subtle" size="xs">
                <UIcon name="i-heroicons-calendar" class="w-3.5 h-3.5" />
                <span class="ml-1">Completed from Plan</span>
              </UBadge>
              <div class="flex flex-col">
                <NuxtLink 
                  :to="`/workouts/planned/${workout.plannedWorkout.id}`"
                  class="text-sm font-medium text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-1 group/link"
                >
                  {{ workout.plannedWorkout.title }}
                  <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                </NuxtLink>
                <div class="flex gap-2 text-[10px] text-gray-500">
                  <span>{{ formatDate(workout.plannedWorkout.date) }}</span>
                  <span>•</span>
                  <span>{{ workout.plannedWorkout.type || 'Workout' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Planned vs Actual Grid -->
          <div class="grid grid-cols-3 gap-2 text-xs">
            <!-- Headers -->
            <div class="text-gray-500 font-medium">Metric</div>
            <div class="text-gray-500 font-medium">Planned</div>
            <div class="text-gray-500 font-medium">Actual</div>

            <!-- Duration -->
            <div class="text-gray-600 dark:text-gray-400">Duration</div>
            <div>{{ workout.plannedWorkout.durationSec ? formatDuration(workout.plannedWorkout.durationSec) : '-' }}</div>
            <div :class="getComplianceColor(workout.durationSec, workout.plannedWorkout.durationSec)">
              {{ formatDuration(workout.durationSec) }}
            </div>

            <!-- Distance (if applicable) -->
            <template v-if="workout.plannedWorkout.distanceMeters || workout.distanceMeters">
              <div class="text-gray-600 dark:text-gray-400">Distance</div>
              <div>{{ workout.plannedWorkout.distanceMeters ? `${(workout.plannedWorkout.distanceMeters / 1000).toFixed(1)} km` : '-' }}</div>
              <div :class="getComplianceColor(workout.distanceMeters, workout.plannedWorkout.distanceMeters)">
                {{ workout.distanceMeters ? `${(workout.distanceMeters / 1000).toFixed(1)} km` : '-' }}
              </div>
            </template>

            <!-- TSS (if applicable) -->
            <template v-if="workout.plannedWorkout.tss || workout.tss">
              <div class="text-gray-600 dark:text-gray-400">TSS</div>
              <div>{{ workout.plannedWorkout.tss ? Math.round(workout.plannedWorkout.tss) : '-' }}</div>
              <div :class="getComplianceColor(workout.tss, workout.plannedWorkout.tss)">
                {{ workout.tss ? Math.round(workout.tss) : '-' }}
              </div>
            </template>
          </div>

          <!-- Description & Structure (from Plan) -->
          <div v-if="workout.plannedWorkout.description" class="mt-4 pt-4 border-t border-blue-100 dark:border-blue-800 space-y-4">
            <!-- Description -->
            <div>
              <h4 class="font-semibold text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">Plan Description</h4>
              <p class="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ workout.plannedWorkout.description }}</p>
            </div>
          </div>
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

  <!-- Delete Confirmation Modal -->
  <UModal
    v-model:open="showDeleteConfirm"
    title="Delete Workout"
    description="Are you sure you want to delete this workout? This action cannot be undone."
  >
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          @click="showDeleteConfirm = false"
        >
          Cancel
        </UButton>
        <UButton
          color="error"
          :loading="isDeleting"
          @click="deleteWorkout"
        >
          Delete
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
  'deleted': [workoutId: string]
  'updated': [workoutId: string]
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isDeleting = ref(false)
const isUnlinking = ref(false)
const showDeleteConfirm = ref(false)
const toast = useToast()

function closeModal() {
  isOpen.value = false
}

async function unlinkWorkout() {
  if (!props.workout?.id) return
  
  if (!confirm('Are you sure you want to unlink this workout from the plan? The planned workout will be marked as pending.')) {
    return
  }

  isUnlinking.value = true
  try {
    await $fetch(`/api/workouts/${props.workout.id}/unlink`, {
      method: 'POST'
    })
    
    toast.add({
      title: 'Unlinked',
      description: 'Workout unlinked from plan',
      color: 'success'
    })
    
    emit('updated', props.workout.id)
    closeModal()
  } catch (error) {
    console.error('Failed to unlink workout:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to unlink workout',
      color: 'error'
    })
  } finally {
    isUnlinking.value = false
  }
}

async function deleteWorkout() {
  if (!props.workout?.id) return

  isDeleting.value = true
  try {
    await $fetch(`/api/workouts/${props.workout.id}`, {
      method: 'DELETE'
    })
    
    toast.add({
      title: 'Workout deleted',
      color: 'success'
    })
    
    showDeleteConfirm.value = false
    emit('deleted', props.workout.id)
    closeModal()
  } catch (error) {
    console.error('Failed to delete workout:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to delete workout',
      color: 'error'
    })
  } finally {
    isDeleting.value = false
  }
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

function getComplianceColor(actual: number | null | undefined, planned: number | null | undefined) {
  if (!actual || !planned) return ''
  const ratio = actual / planned
  if (ratio >= 0.9 && ratio <= 1.1) return 'text-green-600 dark:text-green-400 font-medium'
  if (ratio >= 0.8 && ratio <= 1.2) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}
</script>