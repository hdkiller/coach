// @vitest-environment nuxt

import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePlanArchitect } from '../../../../app/composables/usePlanArchitect'

mockNuxtImport('useToast', () => () => ({ add: vi.fn() }))
mockNuxtImport('useRouter', () => () => ({
  push: vi.fn(),
  replace: vi.fn(),
  afterEach: vi.fn(),
  beforeEach: vi.fn(),
  beforeResolve: vi.fn()
}))

mockNuxtImport('useRoute', () => () => ({ query: {} }))
mockNuxtImport('useLibrarySource', () => () => ({ source: ref('user') }))
mockNuxtImport('useFetch', () => () => ({
  data: ref(
    JSON.parse(
      JSON.stringify({
        id: 'plan-123',
        title: 'Marathon Base Plan',
        blocks: [
          {
            id: 'block-1',
            title: 'Block 1',
            weeks: [{ id: 'week-1', weekNumber: 1, workouts: [] }]
          }
        ]
      })
    )
  ),
  status: ref('success'),
  refresh: vi.fn()
}))

describe('usePlanArchitect Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([]))
  })

  it('initializes plan architect state and normalizes plan response', () => {
    const { draftPlan, loading, viewMode } = usePlanArchitect('plan-123')

    expect(draftPlan.value).not.toBeNull()
    expect(draftPlan.value.title).toBe('Marathon Base Plan')
    expect(loading.value).toBe(false)
    expect(viewMode.value).toBe('board')
  })
})
