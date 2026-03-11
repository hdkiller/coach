import { describe, expect, it } from 'vitest'
import {
  hasVisibleAssistantArtifacts,
  shouldHideAssistantBubble,
  shouldShowAssistantStatusRow
} from '../../../app/utils/chat-message-state'

describe('chat message state helpers', () => {
  it('hides blank failed assistant drafts when explicitly marked', () => {
    const message = {
      role: 'assistant',
      content: ' ',
      parts: [],
      metadata: {
        turnStatus: 'INTERRUPTED',
        hiddenBecauseEmptyFailure: true
      }
    }

    expect(shouldHideAssistantBubble(message)).toBe(true)
    expect(shouldShowAssistantStatusRow(message)).toBe(true)
  })

  it('does not hide interrupted assistant messages with tool approvals', () => {
    const message = {
      role: 'assistant',
      content: ' ',
      parts: [],
      metadata: {
        turnStatus: 'INTERRUPTED',
        hiddenBecauseEmptyFailure: true,
        toolApprovals: [
          {
            approvalId: 'approval-1',
            toolCallId: 'tool-1',
            name: 'ticket_update'
          }
        ]
      }
    }

    expect(hasVisibleAssistantArtifacts(message)).toBe(true)
    expect(shouldHideAssistantBubble(message)).toBe(false)
  })

  it('keeps active hidden drafts hidden until visible output arrives', () => {
    const hiddenDraft = {
      role: 'assistant',
      content: ' ',
      parts: [],
      metadata: {
        turnStatus: 'RUNNING',
        hideUntilContent: true
      }
    }
    const visibleDraft = {
      ...hiddenDraft,
      content: 'Working on it',
      parts: [{ type: 'text', text: 'Working on it' }]
    }

    expect(shouldHideAssistantBubble(hiddenDraft)).toBe(true)
    expect(shouldHideAssistantBubble(visibleDraft)).toBe(false)
  })
})
