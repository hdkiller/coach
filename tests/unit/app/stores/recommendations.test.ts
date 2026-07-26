// @vitest-environment nuxt

import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRecommendationStore } from '../../../../app/stores/recommendations'

mockNuxtImport('useToast', () => () => ({ add: vi.fn() }))
mockNuxtImport('useUserRuns', () => () => ({ refresh: vi.fn() }))
mockNuxtImport('useUserRunsState', () => () => ({
  onTaskCompleted: vi.fn(),
  onTaskFailed: vi.fn()
}))

describe('useRecommendationStore Pinia Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.stubGlobal('$fetch', vi.fn())
  })

  it('initializes with default empty recommendation state', () => {
    const store = useRecommendationStore()
    expect(store.todayRecommendation).toBeNull()
    expect(store.todayWorkouts).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.generating).toBe(false)
  })

  it('fetches today recommendation successfully', async () => {
    const mockRec = { id: 'rec-1', status: 'PROPOSED', recommendation: 'Rest day' }
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(mockRec))

    const store = useRecommendationStore()
    await store.fetchTodayRecommendation()

    expect(store.todayRecommendation).toEqual(mockRec)
    expect(store.loading).toBe(false)
  })

  it('fetches today workouts successfully and sorts by time', async () => {
    const mockWorkouts = [
      { id: 'w2', startTime: '14:00', title: 'Afternoon Run' },
      { id: 'w1', startTime: '08:00', title: 'Morning Ride' }
    ]
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(mockWorkouts))

    const store = useRecommendationStore()
    await store.fetchTodayWorkout()

    expect(store.todayWorkouts.length).toBe(2)
    expect(store.todayWorkouts[0].id).toBe('w1')
    expect(store.todayWorkouts[1].id).toBe('w2')
  })
})
