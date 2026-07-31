// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ChatPlannedWorkoutCard from '../../../../../app/components/chat/ChatPlannedWorkoutCard.vue'
import { hasRenderableStructure } from '../../../../../app/utils/workout-structure'

vi.mock('../../../../../app/composables/useFormat', () => ({
  useFormat: () => ({
    formatDateUTC: (date: string | Date) => String(date)
  })
}))

const strengthBlocksWithSteps = [
  {
    id: 'block-1',
    type: 'single_exercise',
    title: 'Squats',
    steps: [
      {
        id: 'step-1',
        name: 'Back Squat',
        prescriptionMode: 'reps',
        loadMode: 'absolute',
        setRows: [{ id: 'set-1', index: 0, value: '5' }]
      }
    ]
  }
]

const strengthBlocksWithoutSteps = [
  { id: 'block-1', type: 'single_exercise', title: 'Squats', steps: [] }
]

describe('hasRenderableStructure', () => {
  it('detects endurance steps as renderable structure', () => {
    expect(hasRenderableStructure({ steps: [{ type: 'Active', durationSeconds: 600 }] })).toBe(true)
  })

  it('detects legacy exercises arrays as renderable structure', () => {
    expect(hasRenderableStructure({ exercises: [{ id: 'squat', name: 'Back Squat' }] })).toBe(true)
  })

  it('detects strength blocks[].steps as renderable structure', () => {
    expect(hasRenderableStructure({ blocks: strengthBlocksWithSteps })).toBe(true)
  })

  it('rejects blocks that carry no exercise steps', () => {
    expect(hasRenderableStructure({ blocks: strengthBlocksWithoutSteps })).toBe(false)
  })

  it('rejects payloads with no steps, exercises, or blocks', () => {
    expect(hasRenderableStructure({ description: 'Text-only guidance' })).toBe(false)
    expect(hasRenderableStructure(null)).toBe(false)
  })

  it('unwraps a nested structuredWorkout field', () => {
    expect(
      hasRenderableStructure({
        structuredWorkout: { blocks: strengthBlocksWithSteps }
      })
    ).toBe(true)
  })
})

const fetchMock = vi.fn()

const mountCard = (response: any, args: Record<string, any> = {}) =>
  mount(ChatPlannedWorkoutCard, {
    props: {
      toolName: 'create_planned_workout',
      response,
      args
    },
    global: {
      stubs: {
        MiniWorkoutChart: { template: '<div data-test="mini-chart" />' },
        WorkoutMessagesTimeline: true,
        UBadge: { template: '<span><slot /></span>' },
        UButton: { template: '<button><slot /></button>' },
        UIcon: { template: '<i />' },
        UAlert: { template: '<div><slot /></div>' }
      }
    }
  })

describe('ChatPlannedWorkoutCard strength structure detection', () => {
  beforeEach(() => {
    vi.stubGlobal('$fetch', fetchMock)
  })

  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
  })

  it('renders a strength workout with blocks as structured instead of "Waiting for structured workout"', async () => {
    fetchMock.mockResolvedValue({
      workout: {
        id: 'workout-1',
        title: 'Strength Day',
        type: 'WeightTraining',
        syncStatus: 'SYNCED',
        structuredWorkout: { blocks: strengthBlocksWithSteps }
      }
    })

    const wrapper = mountCard(
      { workout_id: 'workout-1' },
      { generate_structure: true, date: '2026-08-01', title: 'Strength Day' }
    )

    await flushPromises()

    expect(wrapper.text()).not.toContain('Waiting for structured workout')
    expect(wrapper.find('[data-test="mini-chart"]').exists()).toBe(true)

    wrapper.unmount()
  })

  it('keeps the waiting state for strength workouts whose blocks have no steps yet', async () => {
    fetchMock.mockResolvedValue({
      workout: {
        id: 'workout-1',
        title: 'Strength Day',
        type: 'WeightTraining',
        syncStatus: 'SYNCED',
        structuredWorkout: { blocks: strengthBlocksWithoutSteps }
      }
    })

    const wrapper = mountCard(
      { workout_id: 'workout-1' },
      { generate_structure: true, date: '2026-08-01', title: 'Strength Day' }
    )

    await flushPromises()

    expect(wrapper.text()).toContain('Waiting for structured workout')
    expect(wrapper.find('[data-test="mini-chart"]').exists()).toBe(false)

    wrapper.unmount()
  })
})
