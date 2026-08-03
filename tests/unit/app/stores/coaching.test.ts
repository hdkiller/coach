// @vitest-environment nuxt

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCoachingStore } from '../../../../app/stores/coaching'

describe('useCoachingStore Pinia Store', () => {
  let assignSpy: ReturnType<typeof vi.fn>
  let reloadSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
    document.cookie = 'coach_wattz_act_as_user=; path=/; max-age=0; SameSite=Lax'

    assignSpy = vi.fn()
    reloadSpy = vi.fn()
    vi.stubGlobal('location', {
      ...window.location,
      assign: assignSpy,
      reload: reloadSpy
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('initializes with empty act-as state', () => {
    const store = useCoachingStore()
    expect(store.actingAsUserId).toBeNull()
    expect(store.actingAsUserName).toBeNull()
    expect(store.isCoachingMode).toBe(false)
  })

  it('startActingAs persists identity and hard-navigates to dashboard', () => {
    const store = useCoachingStore()
    store.startActingAs('athlete-123', 'Ada Athlete')

    expect(store.actingAsUserId).toBe('athlete-123')
    expect(store.actingAsUserName).toBe('Ada Athlete')
    expect(store.isCoachingMode).toBe(true)
    expect(localStorage.getItem('coaching_act_as_id')).toBe('athlete-123')
    expect(localStorage.getItem('coaching_act_as_name')).toBe('Ada Athlete')
    expect(document.cookie).toContain('coach_wattz_act_as_user=athlete-123')
    expect(assignSpy).toHaveBeenCalledWith('/dashboard')
    expect(reloadSpy).not.toHaveBeenCalled()
  })

  it('stopActingAs clears identity and reloads to restore coach session', () => {
    const store = useCoachingStore()
    store.startActingAs('athlete-123', 'Ada Athlete')
    assignSpy.mockClear()

    store.stopActingAs()

    expect(store.actingAsUserId).toBeNull()
    expect(store.actingAsUserName).toBeNull()
    expect(store.isCoachingMode).toBe(false)
    expect(localStorage.getItem('coaching_act_as_id')).toBeNull()
    expect(localStorage.getItem('coaching_act_as_name')).toBeNull()
    expect(reloadSpy).toHaveBeenCalledTimes(1)
    expect(assignSpy).not.toHaveBeenCalled()
  })

  it('clearActingAs clears persistence without navigating', () => {
    const store = useCoachingStore()
    store.startActingAs('athlete-123', 'Ada Athlete')
    assignSpy.mockClear()

    store.clearActingAs()

    expect(store.actingAsUserId).toBeNull()
    expect(localStorage.getItem('coaching_act_as_id')).toBeNull()
    expect(assignSpy).not.toHaveBeenCalled()
    expect(reloadSpy).not.toHaveBeenCalled()
  })
})
