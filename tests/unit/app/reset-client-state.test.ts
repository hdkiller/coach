import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useWorkoutComparisonStore } from '../../../app/stores/workout-comparison'

describe('logout client state hygiene', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('clears workout comparison basket and snapshots', () => {
    const store = useWorkoutComparisonStore()
    store.addWorkout({
      id: 'workout-1',
      title: 'Morning Ride'
    })

    expect(store.count).toBe(1)

    store.clearAll()

    expect(store.count).toBe(0)
    expect(store.selectedWorkouts).toEqual([])
  })
})
