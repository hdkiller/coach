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
      { type: 'tool-result', toolCallId: 'call_1', result: { ok: true } }
    ])
  })
})
