// @vitest-environment nuxt

import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import MealRecommendationModal from '../../../../app/components/nutrition/MealRecommendationModal.vue'

const toastAddMock = vi.fn()

mockNuxtImport('useToast', () => () => ({ add: toastAddMock }))
mockNuxtImport('useUserRunsState', () => () => ({
  onTaskCompleted: vi.fn(),
  onTaskFailed: vi.fn()
}))

const BASE_PROPS = {
  date: '2026-07-31',
  targetCarbs: 80,
  windowType: 'PRE_WORKOUT'
}

// UModal only renders its named slots when instructed to; the real component's
// header/body/footer content lives in those slots. UButton is stubbed as a
// plain <button> so click handlers and :disabled/:loading still behave like a
// real button under test. NutritionMealOptionCard is stubbed with a clickable
// element that emits `select`, mirroring its real click-to-select behavior.
function stubs() {
  return {
    UModal: {
      template: '<div><slot name="header" /><slot name="body" /><slot name="footer" /></div>'
    },
    UButton: {
      props: ['loading', 'disabled', 'color', 'variant', 'icon', 'size'],
      template: '<button :disabled="disabled"><slot /></button>'
    },
    UIcon: { template: '<span />' },
    NutritionMealOptionCard: {
      props: ['option', 'selected'],
      emits: ['select'],
      template:
        '<button class="meal-option-card" @click="$emit(\'select\')">{{ option?.title }}</button>'
    }
  }
}

async function mountModal(props: Record<string, any> = {}) {
  const wrapper = await mountSuspended(MealRecommendationModal, {
    props: { open: false, ...BASE_PROPS, ...props },
    global: {
      renderStubDefaultSlot: true,
      stubs: stubs()
    }
  })
  await flushPromises()
  return wrapper
}

describe('MealRecommendationModal poll fallback (CW-80)', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    toastAddMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('keeps polling run status past the first fallback check instead of giving up after one look', async () => {
    let runStatusCalls = 0
    fetchMock = vi.fn((url: string, options: any = {}) => {
      if (url === '/api/nutrition/recommendations/meal' && options?.method === 'POST') {
        return Promise.resolve({ runId: 'run-1' })
      }
      if (url === '/api/runs/run-1') {
        runStatusCalls += 1
        // LLM generation is still EXECUTING for the first couple of checks —
        // exactly the case where the old single-shot setTimeout gave up.
        if (runStatusCalls < 3) {
          return Promise.resolve({ id: 'run-1', status: 'EXECUTING' })
        }
        return Promise.resolve({
          id: 'run-1',
          status: 'COMPLETED',
          output: { recommendations: [{ id: 'opt-1', title: 'Bagel' }], source: 'catalog' }
        })
      }
      return Promise.reject(new Error(`Unhandled fetch in test: ${url}`))
    })
    vi.stubGlobal('$fetch', fetchMock)

    const wrapper = await mountModal()
    await wrapper.setProps({ open: true })
    await flushPromises()

    // First fallback poll fires ~3s after loading starts.
    await vi.advanceTimersByTimeAsync(3000)
    expect(runStatusCalls).toBe(1)

    // A single-shot fallback would stop here forever; it must poll again.
    await vi.advanceTimersByTimeAsync(3000)
    expect(runStatusCalls).toBe(2)

    // Third check reports COMPLETED and the modal should pick up the result.
    await vi.advanceTimersByTimeAsync(3000)
    expect(runStatusCalls).toBe(3)

    expect(wrapper.find('.meal-option-card').exists()).toBe(true)
    expect(wrapper.text()).toContain('Bagel')

    // Once complete, polling must stop — no further run-status calls.
    await vi.advanceTimersByTimeAsync(30000)
    expect(runStatusCalls).toBe(3)
  })

  it('shows a terminal error toast and stops polling if the run never completes', async () => {
    let runStatusCalls = 0
    fetchMock = vi.fn((url: string, options: any = {}) => {
      if (url === '/api/nutrition/recommendations/meal' && options?.method === 'POST') {
        return Promise.resolve({ runId: 'run-stuck' })
      }
      if (url === '/api/runs/run-stuck') {
        runStatusCalls += 1
        return Promise.resolve({ id: 'run-stuck', status: 'EXECUTING' })
      }
      return Promise.reject(new Error(`Unhandled fetch in test: ${url}`))
    })
    vi.stubGlobal('$fetch', fetchMock)

    const wrapper = await mountModal()
    await wrapper.setProps({ open: true })
    await flushPromises()

    // Drain the polling loop well past the max total wait window.
    await vi.advanceTimersByTimeAsync(95000)

    expect(toastAddMock).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    const callsBeforeIdle = runStatusCalls
    expect(callsBeforeIdle).toBeGreaterThan(0)

    // Confirms polling actually stopped after the terminal timeout fired.
    await vi.advanceTimersByTimeAsync(30000)
    expect(runStatusCalls).toBe(callsBeforeIdle)
  })

  it('stops polling once the component unmounts', async () => {
    let runStatusCalls = 0
    fetchMock = vi.fn((url: string, options: any = {}) => {
      if (url === '/api/nutrition/recommendations/meal' && options?.method === 'POST') {
        return Promise.resolve({ runId: 'run-2' })
      }
      if (url === '/api/runs/run-2') {
        runStatusCalls += 1
        return Promise.resolve({ id: 'run-2', status: 'EXECUTING' })
      }
      return Promise.reject(new Error(`Unhandled fetch in test: ${url}`))
    })
    vi.stubGlobal('$fetch', fetchMock)

    const wrapper = await mountModal()
    await wrapper.setProps({ open: true })
    await flushPromises()

    wrapper.unmount()

    // If the timer weren't cleaned up on unmount, this would still tick and
    // call the run-status endpoint against an unmounted component.
    await vi.advanceTimersByTimeAsync(60000)
    expect(runStatusCalls).toBe(0)
  })
})

describe('MealRecommendationModal selection confirmation errors (CW-80)', () => {
  beforeEach(() => {
    toastAddMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows an error toast when confirming the selected meal fails', async () => {
    const fetchMock = vi.fn((url: string, options: any = {}) => {
      if (url === '/api/nutrition/recommendations/meal' && options?.method === 'POST') {
        return Promise.resolve({ cached: true, recommendationId: 'rec-1' })
      }
      if (url === '/api/nutrition/recommendations/rec-1') {
        return Promise.resolve({
          recommendation: {
            resultJson: {
              recommendations: [{ id: 'opt-1', title: 'Bagel' }],
              source: 'catalog'
            }
          }
        })
      }
      if (url === '/api/nutrition/plan/meal' && options?.method === 'POST') {
        return Promise.reject(new Error('Failed to lock in meal'))
      }
      return Promise.reject(new Error(`Unhandled fetch in test: ${url}`))
    })
    vi.stubGlobal('$fetch', fetchMock)

    const wrapper = await mountModal()
    await wrapper.setProps({ open: true })
    await flushPromises()

    expect(wrapper.find('.meal-option-card').exists()).toBe(true)
    await wrapper.find('.meal-option-card').trigger('click')

    const applyButton = wrapper
      .findAll('button')
      .find((btn) => btn.text().includes('Apply to Plan'))
    expect(applyButton).toBeTruthy()

    await applyButton!.trigger('click')
    await flushPromises()

    expect(toastAddMock).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    // A failed confirmation must not be treated as success.
    expect(wrapper.emitted('updated')).toBeFalsy()
  })
})
