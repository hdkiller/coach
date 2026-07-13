import { describe, expect, it } from 'vitest'
import {
  buildSharedChatMessages,
  shouldIncludeMessageInSharedChat,
  sanitizeSharedChatMessage
} from '../../../../server/utils/chat/share-sanitize'

describe('share-sanitize', () => {
  it('excludes tool messages and hidden assistant drafts', () => {
    const messages = buildSharedChatMessages([
      {
        id: 'user-1',
        senderId: 'user-1',
        content: 'Hello',
        createdAt: new Date('2026-07-13T10:00:00.000Z')
      },
      {
        id: 'tool-1',
        senderId: 'system_tool',
        content: '',
        metadata: {
          toolResponse: [{ type: 'tool-result', toolCallId: 'call-1', result: { ok: true } }]
        },
        createdAt: new Date('2026-07-13T10:00:01.000Z')
      },
      {
        id: 'assistant-hidden',
        senderId: 'ai_agent',
        content: ' ',
        metadata: { hideUntilContent: true },
        createdAt: new Date('2026-07-13T10:00:02.000Z')
      },
      {
        id: 'assistant-1',
        senderId: 'ai_agent',
        content: 'Hi there',
        createdAt: new Date('2026-07-13T10:00:03.000Z')
      }
    ])

    expect(messages).toHaveLength(2)
    expect(messages[0]?.role).toBe('user')
    expect(messages[1]?.role).toBe('assistant')
    expect(messages[1]?.parts).toEqual([{ type: 'text', text: 'Hi there' }])
  })

  it('sanitizes shared messages to text-only parts', () => {
    const sanitized = sanitizeSharedChatMessage({
      id: 'assistant-1',
      role: 'assistant',
      content: 'Visible text',
      parts: [
        { type: 'text', text: 'Visible text' },
        { type: 'tool-create_workout', toolCallId: 'call-1', state: 'approval-requested' }
      ],
      createdAt: new Date('2026-07-13T10:00:03.000Z')
    })

    expect(sanitized.parts).toEqual([{ type: 'text', text: 'Visible text' }])
  })

  it('does not include assistant messages with only tool metadata', () => {
    expect(
      shouldIncludeMessageInSharedChat({
        role: 'assistant',
        content: '',
        parts: [{ type: 'tool-create_workout', toolCallId: 'call-1' }],
        metadata: {}
      })
    ).toBe(true)

    expect(
      shouldIncludeMessageInSharedChat({
        role: 'assistant',
        content: '',
        parts: [],
        metadata: { hiddenBecauseEmptyFailure: true }
      })
    ).toBe(false)
  })
})
