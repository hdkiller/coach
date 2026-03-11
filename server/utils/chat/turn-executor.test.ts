import { describe, expect, it } from 'vitest'
import { normalizeMessagesForSdk } from './turn-executor'

describe('normalizeMessagesForSdk', () => {
  it('preserves tool approval response messages while marking the assistant call approved', () => {
    const messages = [
      {
        id: 'assistant-1',
        role: 'assistant',
        parts: [
          {
            type: 'tool-ticket_create',
            toolCallId: 'call_123',
            state: 'approval-requested',
            input: { title: 'foo', description: 'test' },
            approval: { id: 'call_123' }
          }
        ]
      },
      {
        id: 'tool-1',
        role: 'tool',
        parts: [
          {
            type: 'tool-approval-response',
            approvalId: 'call_123',
            toolCallId: 'call_123',
            approved: true,
            reason: 'User confirmed action.'
          }
        ]
      }
    ]

    const result = normalizeMessagesForSdk(messages)

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      role: 'assistant',
      parts: [
        expect.objectContaining({
          toolCallId: 'call_123',
          state: 'approval-responded',
          approval: expect.objectContaining({
            id: 'call_123',
            approved: true,
            reason: 'User confirmed action.'
          })
        })
      ]
    })
    expect(result[1]).toMatchObject({
      role: 'tool',
      parts: [
        expect.objectContaining({
          type: 'tool-approval-response',
          approvalId: 'call_123',
          toolCallId: 'call_123'
        })
      ]
    })
  })
})
