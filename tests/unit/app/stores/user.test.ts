// @vitest-environment nuxt

import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '../../../../app/stores/user'

mockNuxtImport('useToast', () => () => ({ add: vi.fn() }))
mockNuxtImport('useUserRuns', () => () => ({ refresh: vi.fn() }))
mockNuxtImport('useUserRunsState', () => () => ({ onTaskCompleted: vi.fn() }))

describe('useUserStore Pinia Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.stubGlobal('$fetch', vi.fn())
  })

  it('initializes with default empty state', () => {
    const store = useUserStore()
    expect(store.user).toBeNull()
    expect(store.profile).toBeNull()
    expect(store.dataSyncStatus).toBeNull()
    expect(store.userLoading).toBe(false)
  })

  it('fetches user data successfully via fetchUser()', async () => {
    const mockUserData = {
      id: 'user-123',
      email: 'runner@example.com',
      name: 'Jane Runner',
      subscriptionTier: 'PRO',
      subscriptionStatus: 'ACTIVE'
    }

    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(mockUserData))

    const store = useUserStore()
    await store.fetchUser()

    expect(store.user).toEqual(mockUserData)
    expect(store.userLoading).toBe(false)
  })

  it('handles fetchUser failure gracefully', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(new Error('Network error')))

    const store = useUserStore()
    await store.fetchUser()

    expect(store.user).toBeNull()
    expect(store.userLoading).toBe(false)
  })
})
