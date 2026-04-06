import { readonly, ref, toValue, watch } from 'vue'

type NeighborWorkout = {
  id: string
  title: string
  date: string
  type: string | null
} | null

export function usePlannedWorkoutNeighbors(workoutIdSource: any) {
  const previousWorkout = ref<NeighborWorkout>(null)
  const nextWorkout = ref<NeighborWorkout>(null)
  const neighborsPending = ref(false)

  async function refreshNeighbors() {
    const workoutId = toValue(workoutIdSource)

    if (!workoutId) {
      previousWorkout.value = null
      nextWorkout.value = null
      return
    }

    neighborsPending.value = true
    try {
      const response = (await ($fetch as any)(`/api/workouts/planned/${workoutId}/neighbors`)) as {
        previous: NeighborWorkout
        next: NeighborWorkout
      }
      previousWorkout.value = response?.previous || null
      nextWorkout.value = response?.next || null
    } catch {
      previousWorkout.value = null
      nextWorkout.value = null
    } finally {
      neighborsPending.value = false
    }
  }

  watch(() => toValue(workoutIdSource), refreshNeighbors, { immediate: true })

  return {
    previousWorkout: readonly(previousWorkout),
    nextWorkout: readonly(nextWorkout),
    neighborsPending: readonly(neighborsPending),
    refreshNeighbors
  }
}
