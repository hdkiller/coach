import { describe, expect, it } from 'vitest'
import { shouldExcludeAssistantMessageFromHistory } from '../../../../server/utils/chat/message-state'

describe('server chat message state helpers', () => {
  it('excludes hidden empty failed assistant drafts from future history', () => {
    expect(
      shouldExcludeAssistantMessageFromHistory({
        senderId: 'ai_agent',
        content: ' ',
        metadata: {
          hiddenBecauseEmptyFailure: true,
          turnStatus: 'INTERRUPTED'
        },
        turn: {
          status: 'INTERRUPTED'
        }
      })
    ).toBe(true)
  })

  it('keeps failed assistant messages with tool artifacts in history', () => {
    expect(
      shouldExcludeAssistantMessageFromHistory({
        senderId: 'ai_agent',
        content: ' ',
        metadata: {
          turnStatus: 'FAILED',
          toolCalls: [{ toolCallId: 'call-1', name: 'ticket_update' }]
        },
        turn: {
          status: 'FAILED'
        }
      })
    ).toBe(false)
  })
})
