// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ChatMessageContent from '../../../app/components/chat/ChatMessageContent.vue'

describe('ChatMessageContent', () => {
  it('skips whitespace-only text parts instead of showing the unknown-part fallback', () => {
    const wrapper = mount(ChatMessageContent, {
      props: {
        message: {
          id: 'message-1',
          role: 'assistant',
          parts: [{ type: 'text', text: '   ' }]
        }
      },
      global: {
        stubs: {
          ChatToolCall: true,
          ChatChart: true,
          ChatToolApproval: true,
          ChatDomainToolCard: true,
          ChatPlannedWorkoutCard: true,
          ChatTicketToolCard: true,
          MDC: true,
          UIcon: true
        }
      }
    })

    expect(wrapper.text()).not.toContain('Unknown part type')
    expect(wrapper.find('.message-part').exists()).toBe(false)
  })
})
