import { describe, expect, it } from 'vitest'
import { normalizeCoreMessagesForGemini } from './core-message-normalizer'

describe('normalizeCoreMessagesForGemini', () => {
  it('does not merge assistant tool-call turns with later assistant text turns', () => {
    const result = normalizeCoreMessagesForGemini([
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Checking now.' },
          { type: 'tool-call', toolCallId: 'call_1', toolName: 'lookup', args: { q: 'foo' } }
        ]
      },
      {
        role: 'assistant',
        content: [{ type: 'text', text: 'Additional note.' }]
      }
    ])

    expect(result).toHaveLength(2)
    expect(result[0].role).toBe('assistant')
    expect(result[1].role).toBe('assistant')
  })

  it('drops tool results unless they immediately follow the assistant tool-call turn', () => {
    const result = normalizeCoreMessagesForGemini([
      {
        role: 'assistant',
        content: [{ type: 'tool-call', toolCallId: 'call_1', toolName: 'lookup', args: {} }]
      },
      {
        role: 'assistant',
        content: [{ type: 'text', text: 'Intervening assistant text.' }]
      },
      {
        role: 'tool',
        content: [{ type: 'tool-result', toolCallId: 'call_1', result: { ok: true } }]
      }
    ])

    expect(result).toHaveLength(2)
    expect(result.map((message) => message.role)).toEqual(['assistant', 'assistant'])
  })

  it('keeps valid assistant tool-call and tool-result adjacency intact', () => {
    const result = normalizeCoreMessagesForGemini([
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Checking now.' },
          { type: 'tool-call', toolCallId: 'call_1', toolName: 'lookup', args: {} }
        ]
      },
      {
        role: 'tool',
        content: [{ type: 'tool-result', toolCallId: 'call_1', result: { ok: true } }]
      },
      {
        role: 'assistant',
        content: [{ type: 'text', text: 'Done.' }]
      }
    ])

    expect(result.map((message) => message.role)).toEqual(['assistant', 'tool', 'assistant'])
    expect(result[1].content).toEqual([
      { type: 'tool-result', toolCallId: 'call_1', toolName: 'lookup', result: { ok: true } }
    ])
  })

  it('collapses repeated tool calls for the same id into one part', () => {
    const result = normalizeCoreMessagesForGemini([
      {
        role: 'assistant',
        content: [
          { type: 'tool-call', toolCallId: 'call_1', toolName: 'lookup', input: { q: 'foo' } },
          { type: 'tool-call', toolCallId: 'call_1', toolName: 'lookup', input: { q: 'foo' } },
          { type: 'tool-call', toolCallId: 'call_2', toolName: 'lookup', input: { q: 'bar' } }
        ]
      },
      {
        role: 'tool',
        content: [
          { type: 'tool-result', toolCallId: 'call_1', toolName: 'lookup', result: { ok: true } },
          { type: 'tool-result', toolCallId: 'call_2', toolName: 'lookup', result: { ok: true } }
        ]
      }
    ])

    expect(result[0].content).toHaveLength(2)
    expect(result[0].content.map((part: any) => part.toolCallId)).toEqual(['call_1', 'call_2'])
  })

  it('keeps the deduplicated tool call that still carries a thought signature', () => {
    const result = normalizeCoreMessagesForGemini([
      {
        role: 'assistant',
        content: [
          { type: 'tool-call', toolCallId: 'call_1', toolName: 'lookup', input: {} },
          {
            type: 'tool-call',
            toolCallId: 'call_1',
            toolName: 'lookup',
            input: {},
            providerOptions: { google: { thoughtSignature: 'signed-part' } }
          }
        ]
      },
      {
        role: 'tool',
        content: [
          { type: 'tool-result', toolCallId: 'call_1', toolName: 'lookup', result: { ok: true } }
        ]
      }
    ])

    expect(result[0].content).toHaveLength(1)
    expect(result[0].content[0].providerOptions.google.thoughtSignature).toBe('signed-part')
  })

  it('realigns tool result names with the originating tool call', () => {
    const result = normalizeCoreMessagesForGemini([
      {
        role: 'assistant',
        content: [{ type: 'tool-call', toolCallId: 'call_1', toolName: 'log_meal', input: {} }]
      },
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call_1',
            toolName: 'unknown',
            result: { ok: true }
          }
        ]
      }
    ])

    expect(result[1].content[0].toolName).toBe('log_meal')
  })
  it('drops assistant tool calls whose results did not survive normalization', () => {
    const result = normalizeCoreMessagesForGemini([
      { role: 'user', content: 'q' },
      {
        role: 'assistant',
        content: [
          { type: 'tool-call', toolCallId: 'call_1', toolName: 'lookup', input: {} },
          { type: 'text', text: 'first' }
        ]
      },
      { role: 'assistant', content: [{ type: 'text', text: 'second' }] },
      {
        role: 'tool',
        content: [
          { type: 'tool-result', toolCallId: 'call_1', toolName: 'lookup', result: { ok: true } }
        ]
      },
      { role: 'user', content: 'next' }
    ])

    const orphanCalls = result
      .filter((message: any) => message.role === 'assistant')
      .flatMap((message: any) =>
        Array.isArray(message.content)
          ? message.content.filter((part: any) => part.type === 'tool-call')
          : []
      )

    expect(orphanCalls).toHaveLength(0)
    expect(result.map((message: any) => message.role)).toEqual([
      'user',
      'assistant',
      'assistant',
      'user'
    ])
  })

  it('keeps a tool call whose result survived', () => {
    const result = normalizeCoreMessagesForGemini([
      { role: 'user', content: 'q' },
      {
        role: 'assistant',
        content: [{ type: 'tool-call', toolCallId: 'call_1', toolName: 'lookup', input: {} }]
      },
      {
        role: 'tool',
        content: [
          { type: 'tool-result', toolCallId: 'call_1', toolName: 'lookup', result: { ok: true } }
        ]
      },
      { role: 'user', content: 'next' }
    ])

    expect(result[1].content[0]).toMatchObject({ type: 'tool-call', toolCallId: 'call_1' })
    expect(result[2].role).toBe('tool')
  })

  it('replaces assistant content with a placeholder when every tool call is dropped', () => {
    const result = normalizeCoreMessagesForGemini([
      { role: 'user', content: 'q' },
      {
        role: 'assistant',
        content: [{ type: 'tool-call', toolCallId: 'call_1', toolName: 'lookup', input: {} }]
      },
      { role: 'user', content: 'next' }
    ])

    expect(result[1].content).toEqual([{ type: 'text', text: ' ' }])
  })
})
