import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ChatPlannedWorkoutCard from '../../../app/components/chat/ChatPlannedWorkoutCard.vue'

vi.mock('../../../app/composables/useFormat', () => ({
  useFormat: () => ({
    formatDateUTC: (date: string | Date) => String(date)
  })
}))

const fetchMock = vi.fn()

describe('ChatPlannedWorkoutCard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('$fetch', fetchMock)
    fetchMock.mockResolvedValue({
      workout: {
        id: 'workout-1',
        syncStatus: 'SUCCESS',
        structure: null
      }
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    fetchMock.mockReset()
    vi.unstubAllGlobals()
  })

  it('tracks pollStartedAt without throwing during structure-wait timeout', async () => {
    const wrapper = mount(ChatPlannedWorkoutCard, {
      props: {
        toolName: 'create_planned_workout',
        response: {
          workout_id: 'workout-1',
          structure_generation: 'pending'
        },
        args: {
          generate_structure: true
        }
      },
      global: {
        stubs: {
          MiniWorkoutChart: true,
          WorkoutMessagesTimeline: true,
          UBadge: { template: '<span><slot /></span>' },
          UButton: { template: '<button><slot /></button>' },
          UIcon: { template: '<i />' },
          UAlert: { template: '<div><slot /></div>' }
        }
      }
    })

    await vi.runOnlyPendingTimersAsync()
    await vi.advanceTimersByTimeAsync(130_000)

    expect(wrapper.exists()).toBe(true)
  })
})
