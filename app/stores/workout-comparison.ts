import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'

export interface WorkoutComparisonSnapshot {
  id: string
  title: string
  type?: string | null
  date?: string | Date | null
  athleteName?: string | null
}

function sameIds(left: string[], right: string[]) {
  if (left.length !== right.length) return false
  return left.every((value, index) => value === right[index])
}

export const useWorkoutComparisonStore = defineStore('workout-comparison', () => {
  const selectedWorkoutIds = useStorage<string[]>('workout-comparison:selected-ids', [])
  const snapshots = useStorage<Record<string, WorkoutComparisonSnapshot>>(
    'workout-comparison:snapshots',
    {}
  )

  const selectedWorkouts = computed(() =>
    selectedWorkoutIds.value
      .map((id) => snapshots.value[id])
      .filter((workout): workout is WorkoutComparisonSnapshot => Boolean(workout))
  )

  const count = computed(() => selectedWorkoutIds.value.length)

  function isSelected(workoutId: string) {
    return selectedWorkoutIds.value.includes(workoutId)
  }

  function addWorkout(workout: WorkoutComparisonSnapshot) {
    if (!workout?.id) return

    snapshots.value = {
      ...snapshots.value,
      [workout.id]: workout
    }

    if (!selectedWorkoutIds.value.includes(workout.id)) {
      selectedWorkoutIds.value = [...selectedWorkoutIds.value, workout.id]
    }
  }

  function removeWorkout(workoutId: string) {
    selectedWorkoutIds.value = selectedWorkoutIds.value.filter((id) => id !== workoutId)
  }

  function toggleWorkout(workout: WorkoutComparisonSnapshot) {
    if (isSelected(workout.id)) {
      removeWorkout(workout.id)
      return
    }

    addWorkout(workout)
  }

  function replaceWorkouts(workouts: WorkoutComparisonSnapshot[]) {
    const nextSnapshots = { ...snapshots.value }
    workouts.forEach((workout) => {
      if (workout?.id) {
        nextSnapshots[workout.id] = workout
      }
    })
    snapshots.value = nextSnapshots

    const nextIds = workouts.map((workout) => workout.id)
    if (!sameIds(selectedWorkoutIds.value, nextIds)) {
      selectedWorkoutIds.value = nextIds
    }
  }

  function clear() {
    selectedWorkoutIds.value = []
  }

  function setWorkoutIds(workoutIds: string[]) {
    const nextIds = Array.from(new Set(workoutIds.filter(Boolean)))
    if (!sameIds(selectedWorkoutIds.value, nextIds)) {
      selectedWorkoutIds.value = nextIds
    }
  }

  return {
    selectedWorkoutIds,
    selectedWorkouts,
    count,
    isSelected,
    addWorkout,
    removeWorkout,
    toggleWorkout,
    replaceWorkouts,
    clear,
    setWorkoutIds
  }
})
