// @vitest-environment nuxt

import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useIntegrationStore } from '../../../../app/stores/integrations'

mockNuxtImport('useToast', () => () => ({ add: vi.fn() }))
mockNuxtImport('useUserRunsState', () => () => ({
  onTaskCompleted: vi.fn(),
  onTaskFailed: vi.fn()
}))

describe('useIntegrationStore Pinia Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.stubGlobal('$fetch', vi.fn())
  })

  it('initializes with default status and computes connection flags correctly', () => {
    const store = useIntegrationStore()
    expect(store.integrationStatus).toBeNull()
    expect(store.intervalsConnected).toBe(false)
    expect(store.whoopConnected).toBe(false)
    expect(store.fitbitConnected).toBe(false)
    expect(store.lastSyncTime).toBeNull()
  })

  it('fetches integration status and updates computed connection properties', async () => {
    const mockStatus = {
      integrations: [
        {
          provider: 'intervals',
          connected: true,
          lastSyncAt: '2026-03-10T10:00:00Z',
          isOAuthApp: true
        },
        { provider: 'whoop', connected: true, lastSyncAt: '2026-03-09T10:00:00Z', isOAuthApp: true }
      ]
    }

    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(mockStatus))

    const store = useIntegrationStore()
    await store.fetchStatus()

    expect(store.intervalsConnected).toBe(true)
    expect(store.whoopConnected).toBe(true)
    expect(store.fitbitConnected).toBe(false)
    expect(store.oauthAppCount).toBe(2)
    expect(store.lastSyncTime).toBe('2026-03-10T10:00:00Z')
  })
})
