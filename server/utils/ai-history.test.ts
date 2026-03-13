import { describe, it, expect } from 'vitest'
import { transformHistoryToCoreMessages } from './ai-history'
import { expandStoredChatMessage } from './chat/history'

describe('transformHistoryToCoreMessages', () => {
  it('converts basic user and assistant text messages', async () => {
    const history = [
      {
        id: '1',
        role: 'user',
        content: 'Hello',
        parts: [{ type: 'text', text: 'Hello' }]
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Hi there',
        parts: [{ type: 'text', text: 'Hi there' }]
      }
    ]

    const result = await transformHistoryToCoreMessages(history)

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ role: 'user', content: [{ type: 'text', text: 'Hello' }] })
    expect(result[1]).toMatchObject({
      role: 'assistant',
      content: [{ type: 'text', text: 'Hi there' }]
    })
  })

  it('injects tool-call when followed by a tool-approval-response', async () => {
    const history = [
      {
        id: '1',
        role: 'assistant',
        content: 'I will help.',
        parts: [
          { type: 'text', text: 'I will help.' },
          {
            type: 'tool-approval-request',
            toolCallId: 'call_123',
            toolName: 'test_tool',
            args: { foo: 'bar' }
          }
        ]
      },
      {
        id: '2',
        role: 'tool',
        content: [
          {
            type: 'tool-approval-response',
            toolCallId: 'call_123',
            approved: true
          }
        ]
      }
    ]

    const result = await transformHistoryToCoreMessages(history)

    const assistantMsg = result[0]
    expect(assistantMsg.role).toBe('assistant')
    // Expect correct tool name 'test_tool'
    expect(assistantMsg.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'text', text: 'I will help.' }),
        expect.objectContaining({
          type: 'tool-call',
          toolCallId: 'call_123',
          toolName: 'test_tool',
          input: { foo: 'bar' }
        })
      ])
    )

    const toolMsg = result[1]
    expect(toolMsg.role).toBe('tool')
    expect(toolMsg.content).toEqual(
      expect.arrayContaining([
        {
          type: 'tool-result',
          toolCallId: 'call_123',
          toolName: 'unknown',
          output: { type: 'text', value: 'User confirmed action.' }
        }
      ])
    )
  })

  it('does NOT inject tool-call if user denies/ignores (no subsequent tool result)', async () => {
    const history = [
      {
        id: '1',
        role: 'assistant',
        content: 'Shall I run this?',
        parts: [
          { type: 'text', text: 'Shall I run this?' },
          {
            type: 'tool-approval-request',
            toolCallId: 'call_456',
            toolName: 'dangerous_tool',
            args: {}
          }
        ]
      },
      {
        id: '2',
        role: 'user',
        content: 'No, stop.',
        parts: [{ type: 'text', text: 'No, stop.' }]
      }
    ]

    const result = await transformHistoryToCoreMessages(history)

    const assistantMsg = result[0]
    expect(assistantMsg.role).toBe('assistant')
    const toolCalls = (assistantMsg.content as any[]).filter((p) => p.type === 'tool-call')

    // We expect 0 tool calls because the user didn't approve it
    expect(toolCalls).toHaveLength(0)

    expect(result[1]).toMatchObject({
      role: 'user',
      content: [{ type: 'text', text: 'No, stop.' }]
    })
  })

  it('handles "assistant" role mapping to "model"', async () => {
    const history = [
      {
        id: '1',
        role: 'assistant',
        content: 'I am a model',
        parts: [{ type: 'text', text: 'I am a model' }]
      }
    ]
    const result = await transformHistoryToCoreMessages(history)
    expect(result[0].role).toBe('assistant')
  })

  it('ensures "model" messages never have empty content', async () => {
    const history = [
      {
        id: '1',
        role: 'assistant',
        content: '',
        parts: [] // Empty parts
      }
    ]
    const result = await transformHistoryToCoreMessages(history)
    // If input is empty, result should be empty (filtered out) or valid.
    if (result.length > 0) {
      expect(result[0].content).toEqual([{ type: 'text', text: ' ' }])
    } else {
      expect(result).toHaveLength(0)
    }
  })

  it('correctly maps tool invocations that are already resolved', async () => {
    const history = [
      {
        id: '1',
        role: 'assistant',
        content: '',
        parts: [
          {
            type: 'tool-invocation',
            toolCallId: 'call_789',
            toolName: 'fast_tool',
            args: {},
            state: 'result',
            result: 'done'
          }
        ]
      }
    ]

    const result = await transformHistoryToCoreMessages(history)

    const assistantMsg = result[0]
    expect(assistantMsg.role).toBe('assistant')

    const toolCalls = (assistantMsg.content as any[]).filter((p) => p.type === 'tool-call')
    expect(toolCalls).toHaveLength(1)
    expect(toolCalls[0].toolCallId).toBe('call_789')
    expect(toolCalls[0].toolName).toBe('fast_tool')
  })

  it('merges duplicate consecutive tool result turns for the same tool call', async () => {
    const history = [
      {
        id: '1',
        role: 'assistant',
        content: '',
        parts: [
          {
            type: 'tool-invocation',
            toolCallId: 'call_1',
            toolName: 'lookup',
            args: { q: 'foo' },
            state: 'result',
            result: { answer: 1 }
          }
        ]
      },
      {
        id: '2',
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call_1',
            toolName: 'lookup',
            result: { answer: 1 }
          }
        ]
      }
    ]

    const result = await transformHistoryToCoreMessages(history)

    expect(result).toHaveLength(2)
    expect(result[0].role).toBe('assistant')
    expect(result[1].role).toBe('tool')
    expect(result[1].content).toEqual([
      {
        type: 'tool-result',
        toolCallId: 'call_1',
        toolName: 'lookup',
        output: {
          type: 'json',
          value: { answer: 1 }
        }
      }
    ])
  })

  it('emits normalized tool results for resolved tool invocations', async () => {
    const history = [
      {
        id: '1',
        role: 'assistant',
        content: '',
        parts: [
          {
            type: 'tool-invocation',
            toolCallId: 'call_789',
            toolName: 'lookup',
            args: { q: 'foo' },
            state: 'result',
            result: { answer: 42 }
          }
        ]
      }
    ]

    const result = await transformHistoryToCoreMessages(history)

    expect(result[1]).toMatchObject({
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId: 'call_789',
          toolName: 'lookup',
          output: { type: 'json', value: { answer: 42 } }
        }
      ]
    })
  })

  it('preserves approved pending tool calls reconstructed from stored assistant messages', async () => {
    const assistantMessage = expandStoredChatMessage({
      id: 'assistant-1',
      senderId: 'ai_agent',
      content: '',
      createdAt: new Date('2026-03-11T12:00:00Z'),
      updatedAt: new Date('2026-03-11T12:00:00Z'),
      metadata: {
        toolCalls: [
          {
            toolCallId: 'call_approved',
            toolName: 'test_tool',
            args: { foo: 'bar' }
          }
        ],
        pendingApprovals: [
          {
            toolCallId: 'call_approved',
            toolName: 'test_tool',
            args: { foo: 'bar' }
          }
        ]
      }
    })

    assistantMessage.parts = [
      ...(assistantMessage.parts || []),
      {
        type: 'tool-test_tool',
        toolCallId: 'call_approved',
        state: 'approval-responded',
        input: { foo: 'bar' },
        approval: {
          id: 'call_approved',
          approved: true,
          reason: 'User confirmed action.'
        }
      }
    ]

    const result = await transformHistoryToCoreMessages([assistantMessage])

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      role: 'assistant'
    })
    expect(result[0].content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'tool-call',
          toolCallId: 'call_approved',
          toolName: 'test_tool',
          input: { foo: 'bar' }
        })
      ])
    )
    expect((result[0].content as any[]).some((part) => part.type === 'tool-approval-request')).toBe(
      false
    )
  })

  it('does not retain unrelated pending approval calls when a later approval is responded', async () => {
    const history = [
      {
        id: 'user-1',
        role: 'user',
        content: 'create ticket',
        parts: [{ type: 'text', text: 'create ticket' }]
      },
      {
        id: 'assistant-pending-1',
        role: 'assistant',
        content: ' ',
        parts: [
          {
            type: 'tool-ticket_create',
            toolCallId: 'call_old',
            state: 'approval-requested',
            input: { title: 'foo', description: 'test' },
            approval: { id: 'call_old' }
          }
        ]
      },
      {
        id: 'user-2',
        role: 'user',
        content: 'create ticket again',
        parts: [{ type: 'text', text: 'create ticket again' }]
      },
      {
        id: 'assistant-pending-2',
        role: 'assistant',
        content: ' ',
        parts: [
          {
            type: 'tool-ticket_create',
            toolCallId: 'call_new',
            state: 'approval-responded',
            input: { title: 'foo', description: 'test' },
            approval: { id: 'call_new', approved: true, reason: 'User confirmed action.' }
          }
        ]
      }
    ]

    const result = await transformHistoryToCoreMessages(history)

    const allToolCalls = result.flatMap((message: any) =>
      Array.isArray(message.content)
        ? message.content.filter((part: any) => part.type === 'tool-call')
        : []
    )

    expect(allToolCalls.some((part: any) => part.toolCallId === 'call_old')).toBe(false)
    expect(allToolCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'tool-call',
          toolCallId: 'call_new',
          toolName: 'ticket_create'
        })
      ])
    )
  })

  it('reuses raw persisted tool-call parts so Gemini signatures survive continuation turns', async () => {
    const assistantMessage = expandStoredChatMessage({
      id: 'assistant-signed',
      senderId: 'ai_agent',
      content: '',
      createdAt: new Date('2026-03-11T12:00:00Z'),
      updatedAt: new Date('2026-03-11T12:00:00Z'),
      metadata: {
        toolCalls: [
          {
            toolCallId: 'call_signed',
            toolName: 'update_sport_settings',
            args: { ftp: 250 },
            rawToolCall: {
              type: 'tool-call',
              toolCallId: 'call_signed',
              toolName: 'update_sport_settings',
              input: { ftp: 250 },
              thoughtSignature: 'signed-part'
            }
          }
        ]
      }
    })

    const result = await transformHistoryToCoreMessages([assistantMessage])
    const toolCall = (result[0].content as any[]).find((part) => part.type === 'tool-call')

    expect(toolCall).toMatchObject({
      type: 'tool-call',
      toolCallId: 'call_signed',
      toolName: 'update_sport_settings',
      input: { ftp: 250 },
      thoughtSignature: 'signed-part'
    })
  })
})
