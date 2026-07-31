// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import CoachCalendarPanel from '../../../../../app/components/coaching/CoachCalendarPanel.vue'
import CoachCalendarDayCard from '../../../../../app/components/coaching/CoachCalendarDayCard.vue'

vi.mock('../../../../../app/composables/useFormat', () => ({
  useFormat: () => ({
    formatDateUTC: (date: string | Date) => String(date)
  })
}))

const mountPanel = () =>
  mount(CoachCalendarPanel, {
    props: {
      athlete: { id: 'athlete-1', name: 'Athlete One', image: null },
      athleteOptions: [],
      selectedAthleteId: 'athlete-1',
      viewMode: 'week-board',
      currentDate: new Date('2026-07-27T00:00:00Z'),
      data: { activities: [] }
    },
    global: {
      stubs: {
        UAvatar: { template: '<div />' },
        USelectMenu: { template: '<div />' },
        UBadge: { template: '<div><slot /></div>' },
        USkeleton: { template: '<div />' },
        UAlert: { template: '<div />' },
        CoachCalendarDayCard: true
      }
    }
  })

describe('CoachCalendarPanel drop handling', () => {
  it('swallows a malformed JSON drop payload instead of throwing', () => {
    const wrapper = mountPanel()
    const firstDayCard = wrapper.findComponent(CoachCalendarDayCard)
    expect(firstDayCard.exists()).toBe(true)

    const dropEvent = {
      dataTransfer: {
        getData: () => '{not valid json'
      }
    }

    expect(() => firstDayCard.vm.$emit('drop', dropEvent)).not.toThrow()

    wrapper.unmount()
  })

  it('ignores a drop payload with no application/json data', () => {
    const wrapper = mountPanel()
    const firstDayCard = wrapper.findComponent(CoachCalendarDayCard)

    const dropEvent = {
      dataTransfer: {
        getData: () => ''
      }
    }

    expect(() => firstDayCard.vm.$emit('drop', dropEvent)).not.toThrow()
    expect(wrapper.emitted('movePlannedWorkout')).toBeUndefined()
    expect(wrapper.emitted('scheduleTemplate')).toBeUndefined()
    expect(wrapper.emitted('duplicatePlannedWorkout')).toBeUndefined()

    wrapper.unmount()
  })
})
