import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ChatDomainToolCard from '../../../app/components/chat/ChatDomainToolCard.vue'

describe('ChatDomainToolCard', () => {
  it('treats patch_nutrition_items as a nutrition tool', () => {
    const wrapper = mount(ChatDomainToolCard, {
      props: {
        toolName: 'patch_nutrition_items',
        status: 'success',
        response: {
          message: 'Successfully updated 1 item in snacks.',
          totals: {
            calories: 500,
            protein: 25,
            carbs: 60,
            fat: 10,
            water_ml: 250
          }
        }
      },
      global: {
        stubs: {
          UBadge: {
            template: '<span><slot /></span>'
          },
          UIcon: {
            props: ['name'],
            template: '<i :data-name="name" />'
          }
        }
      }
    })

    const icon = wrapper.find('i[data-name]')

    expect(icon.attributes('data-name')).toBe('i-heroicons-cake')
    expect(wrapper.text()).toContain('Patch Nutrition Items')
    expect(wrapper.text()).toContain('Successfully updated 1 item in snacks.')
  })
})
