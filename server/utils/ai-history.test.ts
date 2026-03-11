import { describe, it, expect } from 'vitest'
import { transformHistoryToCoreMessages } from './ai-history'

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
})
