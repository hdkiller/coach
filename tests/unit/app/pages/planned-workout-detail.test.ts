// @vitest-environment nuxt

import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import PlannedWorkoutDetailPage from '../../../../app/pages/workouts/planned/[id]/index.vue'

// Reactive stand-in for the global Trigger.dev runs list. Each test seeds this
// before mounting so we can simulate the page mounting (e.g. after a reload)
// while a structure generation/adjustment run is already in flight.
const activeRuns = ref<any[]>([])

mockNuxtImport('useRoute', () => () => ({ params: { id: 'workout-1' }, query: {} }))
mockNuxtImport('useToast', () => () => ({ add: vi.fn() }))
mockNuxtImport('useFormat', () => () => ({
  formatDateUTC: (_date: unknown, formatStr?: string) => formatStr || '',
  getUserLocalDate: () => new Date('2026-07-31T00:00:00.000Z'),
  timezone: 'UTC'
}))
mockNuxtImport('usePlannedWorkoutNeighbors', () => () => ({
  previousWorkout: ref(null),
  nextWorkout: ref(null),
  neighborsPending: ref(false),
  refreshNeighbors: vi.fn()
}))
mockNuxtImport('useUserRuns', () => () => ({ refresh: vi.fn() }))
mockNuxtImport('useUserRunsState', () => () => ({
  runs: activeRuns,
  onTaskCompleted: vi.fn(),
  onTaskFailed: vi.fn()
}))
mockNuxtImport('useUpgradeModal', () => () => ({
  isOpen: ref(false),
  options: ref({}),
  show: vi.fn(),
  close: vi.fn()
}))

const WORKOUT_ID = 'workout-1'

function buildWorkoutResponse(overrides: Record<string, any> = {}) {
  return {
    workout: {
      id: WORKOUT_ID,
      title: 'Sweet Spot Intervals',
      type: 'Ride',
      date: '2026-07-31',
      durationSec: 3600,
      workIntensity: 0.75,
      structuredWorkout: null,
      trainingWeek: null,
      syncConflict: false,
      ...overrides.workout
    },
    userFtp: 250,
    llmUsageId: null,
    initialFeedback: null,
    initialFeedbackText: null,
    sportSettings: {},
    settingsStaleness: null,
    structureGenerationInFlight: false,
    hasRenderableStructure: true,
    ...overrides
  }
}

// The page's meaningful content (badges, buttons) lives inside the `#body`
// slot of `UDashboardPanel` / `UDashboardNavbar`. Plain `shallow: true`
// stubbing replaces those components (and their slot content) entirely, so
// we give them slot-preserving stubs while still shallow-stubbing everything
// else (Nuxt UI primitives, nested workout view components, modals, ...).
async function mountPage() {
  const wrapper = await mountSuspended(PlannedWorkoutDetailPage, {
    shallow: true,
    global: {
      // Shallow-stubbed components render nothing at all by default; this
      // makes them render their *default* slot, which is needed so
      // UButton/UBadge labels ("Build Structure", "Structure generation
      // running", ...) still show up in the rendered text.
      renderStubDefaultSlot: true,
      stubs: {
        // These two gate ALL of the page's #body content behind *named*
        // slots, which renderStubDefaultSlot does not cover, so they need
        // explicit slot-preserving templates.
        UDashboardPanel: {
          template: '<div><slot name="header" /><slot name="body" /><slot /></div>'
        },
        UDashboardNavbar: {
          template:
            '<div><slot name="title" /><slot name="leading" /><slot name="right" /><slot /></div>'
        }
      }
    }
  })

  await flushPromises()
  await nextTick()
  await nextTick()

  return wrapper
}

describe('Planned workout detail generation state restoration (CW-5)', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    setActivePinia(createPinia())
    activeRuns.value = []
    fetchMock.mockReset()
    fetchMock.mockImplementation(async (url: string) => {
      if (url === `/api/workouts/planned/${WORKOUT_ID}`) {
        return buildWorkoutResponse()
      }
      // Everything else (integrations status, neighbors, nutrition, ...) is
      // wrapped in try/catch on the page, so a rejection is a safe "no data".
      throw new Error(`Unhandled fetch in test: ${url}`)
    })
    // @sidebase/nuxt-auth calls `$fetch.raw` during app init to load the session;
    // give the stub a harmless implementation so that unrelated plugin doesn't
    // pollute this page-level test with unrelated console noise.
    ;(fetchMock as any).raw = vi.fn().mockResolvedValue({ _data: null })
    vi.stubGlobal('$fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('restores the generating banner after mount when a structure generation run is already active', async () => {
    activeRuns.value = [
      {
        id: 'run-1',
        taskIdentifier: 'generate-structured-workout',
        status: 'EXECUTING',
        startedAt: new Date().toISOString(),
        tags: [`planned-workout:${WORKOUT_ID}`]
      }
    ]

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Structure generation running')
    expect(wrapper.text()).toContain('Generating...')
    expect(wrapper.text()).not.toContain('Build Structure')
  })

  it('restores the adjusting state (not generating) when the active run is an adjustment', async () => {
    activeRuns.value = [
      {
        id: 'run-2',
        taskIdentifier: 'adjust-structured-workout',
        status: 'EXECUTING',
        startedAt: new Date().toISOString(),
        tags: [`planned-workout:${WORKOUT_ID}`]
      }
    ]

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Structure update running')
  })

  it('does not show the generating banner when there is no active run for this workout', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).not.toContain('Structure generation running')
    expect(wrapper.text()).toContain('Build Structure')
  })

  it('ignores active runs tagged for a different workout', async () => {
    activeRuns.value = [
      {
        id: 'run-3',
        taskIdentifier: 'generate-structured-workout',
        status: 'EXECUTING',
        startedAt: new Date().toISOString(),
        tags: ['planned-workout:some-other-workout']
      }
    ]

    const wrapper = await mountPage()

    expect(wrapper.text()).not.toContain('Structure generation running')
    expect(wrapper.text()).toContain('Build Structure')
  })
})
