// @vitest-environment nuxt

import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import DashboardPage from '../../../../app/pages/dashboard.vue'
import { useIntegrationStore } from '../../../../app/stores/integrations'

// `t` from @tolgee/vue is used both as a plain function in templates
// (`t('key')`) and as `t.value('key')` inside computed()/plain functions in
// dashboard.vue, so the stand-in needs to support both call shapes.
function makeTranslateStub() {
  const t = (key: string) => key
  ;(t as any).value = t
  return t
}

vi.mock('@tolgee/vue', () => ({
  useTranslate: () => ({ t: makeTranslateStub() })
}))

// Captures the callbacks that both `app/stores/integrations.ts` and
// `app/pages/dashboard.vue` register via `onTaskCompleted`/`onTaskFailed`, so
// tests can simulate a Trigger.dev run reaching a terminal state without
// depending on the real realtime-runs composable.
type RunCallback = (run: any) => void | Promise<void>
const completedHandlers: Record<string, RunCallback[]> = {}
const failedHandlers: Record<string, RunCallback[]> = {}

function register(map: Record<string, RunCallback[]>, taskIdentifier: string, cb: RunCallback) {
  ;(map[taskIdentifier] ||= []).push(cb)
}

async function fireFailed(taskIdentifier: string, run: any) {
  for (const cb of failedHandlers[taskIdentifier] || []) {
    await cb(run)
  }
}

async function fireCompleted(taskIdentifier: string, run: any) {
  for (const cb of completedHandlers[taskIdentifier] || []) {
    await cb(run)
  }
}

const toastAdd = vi.fn()
const toastUpdate = vi.fn()

mockNuxtImport('useToast', () => () => ({
  add: toastAdd,
  update: toastUpdate,
  toasts: ref([])
}))

mockNuxtImport('useUserRuns', () => () => ({ refresh: vi.fn() }))
mockNuxtImport('useUserRunsState', () => () => ({
  runs: ref([]),
  onTaskCompleted: vi.fn((taskIdentifier: string, cb: RunCallback) =>
    register(completedHandlers, taskIdentifier, cb)
  ),
  onTaskFailed: vi.fn((taskIdentifier: string, cb: RunCallback) =>
    register(failedHandlers, taskIdentifier, cb)
  )
}))

mockNuxtImport('useAnalytics', () => () => ({ trackWidgetClick: vi.fn() }))
mockNuxtImport('useFormat', () => () => ({
  formatDate: vi.fn(() => ''),
  formatDateUTC: vi.fn(() => ''),
  getUserLocalDate: () => new Date('2026-07-31T00:00:00.000Z')
}))
mockNuxtImport('useReleaseNotes', () => () => ({
  openReleaseModal: vi.fn()
}))
mockNuxtImport('useTriggerMonitor', () => () => ({
  toggle: vi.fn()
}))

// The performance scores card exposes a `refresh()` that the page's ingest
// success handler awaits via a template ref. The default shallow-stub has no
// such method, so give it one explicitly to avoid a spurious TypeError.
const PerformanceScoresCardStub = defineComponent({
  name: 'DashboardPerformanceScoresCard',
  setup(_, { expose }) {
    expose({ refresh: vi.fn() })
    return () => null
  }
})

async function mountPage() {
  const wrapper = await mountSuspended(DashboardPage, {
    shallow: true,
    global: {
      renderStubDefaultSlot: true,
      stubs: {
        UDashboardPanel: {
          template: '<div><slot name="header" /><slot name="body" /><slot /></div>'
        },
        UDashboardNavbar: {
          template:
            '<div><slot name="title" /><slot name="leading" /><slot name="right" /><slot /></div>'
        },
        DashboardPerformanceScoresCard: PerformanceScoresCardStub
      }
    }
  })

  await flushPromises()
  await nextTick()
  await nextTick()

  return wrapper
}

describe('Dashboard sync failure handling (CW-39)', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    delete completedHandlers['ingest-all']
    delete failedHandlers['ingest-all']

    fetchMock.mockReset()
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/integrations/status') {
        return { integrations: [] }
      }
      if (url === '/api/profile/dashboard') {
        return { profile: null, dataSyncStatus: null, missingFields: [] }
      }
      if (url === '/api/user/onboarding-status') {
        return {
          signupMethod: 'unknown',
          currentStep: 'connect_data',
          steps: [],
          importState: 'idle',
          connectedProviders: [],
          hasIntegration: false,
          hasAnyData: false,
          hasUsableData: false,
          hasFirstInsight: false,
          activationComplete: false,
          showFullSetupHub: false,
          showCompactSetupCard: false,
          primaryProvider: null,
          workoutCount: 0,
          wellnessCount: 0,
          nutritionCount: 0,
          importErrorMessage: null,
          hasConsent: true,
          hasPrimaryGoal: true
        }
      }
      // Everything else the page might touch (nutrition, upcoming workouts,
      // recent activity, ...) is wrapped in try/catch, so a rejection is a
      // safe "no data" for anything we don't explicitly stub above.
      throw new Error(`Unhandled fetch in test: ${url}`)
    })
    ;(fetchMock as any).raw = vi.fn().mockResolvedValue({ _data: null })
    vi.stubGlobal('$fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resets syncingData and shows an error toast when the ingest-all run fails', async () => {
    await mountPage()

    const integrationStore = useIntegrationStore()
    integrationStore.syncingData = true

    await fireFailed('ingest-all', { error: { message: 'Ingestion blew up' } })
    await flushPromises()

    expect(integrationStore.syncingData).toBe(false)

    const errorCall = toastAdd.mock.calls.find((call) => call[0]?.color === 'error')
    expect(errorCall).toBeTruthy()
  })

  it('resets syncingData even when the failed run carries no error message', async () => {
    await mountPage()

    const integrationStore = useIntegrationStore()
    integrationStore.syncingData = true

    await fireFailed('ingest-all', {})
    await flushPromises()

    expect(integrationStore.syncingData).toBe(false)
    expect(toastAdd.mock.calls.some((call) => call[0]?.color === 'error')).toBe(true)
  })

  it('still resets syncingData and shows a success toast when ingest-all completes successfully', async () => {
    await mountPage()

    const integrationStore = useIntegrationStore()
    integrationStore.syncingData = true

    await fireCompleted('ingest-all', { output: { success: true, failedCount: 0, results: [] } })
    await flushPromises()

    expect(integrationStore.syncingData).toBe(false)

    const successCall = toastAdd.mock.calls.find((call) => call[0]?.color === 'success')
    expect(successCall).toBeTruthy()
  })

  it('shows a warning toast (not an error) when ingest-all completes with partial failures', async () => {
    await mountPage()

    const integrationStore = useIntegrationStore()
    integrationStore.syncingData = true

    await fireCompleted('ingest-all', {
      output: { success: false, failedCount: 2, results: [] }
    })
    await flushPromises()

    expect(integrationStore.syncingData).toBe(false)
    expect(toastAdd.mock.calls.some((call) => call[0]?.color === 'warning')).toBe(true)
    expect(toastAdd.mock.calls.some((call) => call[0]?.color === 'error')).toBe(false)
  })
})
