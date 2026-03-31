import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardHydrationQuickCard from '../../../app/components/dashboard/HydrationQuickCard.vue'

const fetchMock = vi.fn()

describe('DashboardHydrationQuickCard', () => {
  beforeEach(() => {
    vi.stubGlobal('$fetch', fetchMock)
  })

  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
  })

  it('renders hydration totals with fallback target when no plan is present', () => {
    const wrapper = mount(DashboardHydrationQuickCard, {
      props: {
        date: '2026-03-31',
        showHeader: true,
        nutrition: {
          waterMl: 0
        }
      },
      global: {
        stubs: {
          UCard: { template: '<div><slot name="header" /><slot /></div>' },
          UBadge: { template: '<span><slot /></span>' },
          UButton: {
            props: ['disabled', 'loading'],
            template:
              '<button :disabled="disabled" :data-loading="loading" @click="$emit(\'click\')"><slot /></button>'
          },
          UIcon: { template: '<i />' },
          USkeleton: { template: '<div />' }
        }
      }
    })

    expect(wrapper.text()).toContain('0.0L')
    expect(wrapper.text()).toContain('of 2.0L target')
    expect(wrapper.text()).toContain('+250ml')
    expect(wrapper.text()).toContain('+500ml')
    expect(wrapper.text()).toContain('+750ml')
  })

  it('quick-adds hydration and emits refresh after success', async () => {
    fetchMock.mockResolvedValue({
      success: true,
      totalWaterMl: 3065
    })

    const wrapper = mount(DashboardHydrationQuickCard, {
      props: {
        date: '2026-03-31',
        nutrition: {
          waterMl: 2565,
          fuelingPlan: {
            dailyTotals: {
              fluid: 3000
            }
          }
        }
      },
      global: {
        stubs: {
          UCard: { template: '<div><slot name="header" /><slot /></div>' },
          UBadge: { template: '<span><slot /></span>' },
          UButton: {
            props: ['disabled', 'loading'],
            template:
              '<button :disabled="disabled" :data-loading="loading" @click="$emit(\'click\')"><slot /></button>'
          },
          UIcon: { template: '<i />' },
          USkeleton: { template: '<div />' }
        }
      }
    })

    const quickAddButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('+250ml'))
    await quickAddButton!.trigger('click')
    await Promise.resolve()

    expect(fetchMock).toHaveBeenCalledWith('/api/nutrition/hydration-quick-add', {
      method: 'POST',
      body: {
        date: '2026-03-31',
        volumeMl: 250
      }
    })
    expect(wrapper.text()).toContain('3.1L')
    expect(wrapper.emitted('refresh')).toHaveLength(1)
  })

  it('restores the previous value when quick-add fails', async () => {
    fetchMock.mockRejectedValue(new Error('network'))

    const wrapper = mount(DashboardHydrationQuickCard, {
      props: {
        date: '2026-03-31',
        nutrition: {
          waterMl: 2565,
          fuelingPlan: {
            dailyTotals: {
              fluid: 3000
            }
          }
        }
      },
      global: {
        stubs: {
          UCard: { template: '<div><slot name="header" /><slot /></div>' },
          UBadge: { template: '<span><slot /></span>' },
          UButton: {
            props: ['disabled', 'loading'],
            template:
              '<button :disabled="disabled" :data-loading="loading" @click="$emit(\'click\')"><slot /></button>'
          },
          UIcon: { template: '<i />' },
          USkeleton: { template: '<div />' }
        }
      }
    })

    const quickAddButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('+500ml'))
    await quickAddButton!.trigger('click')
    await Promise.resolve()

    expect(wrapper.text()).toContain('2.6L')
  })
})
