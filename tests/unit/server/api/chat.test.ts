import { describe, expect, it } from 'vitest'
import {
  sanitizeChatMessagesForToolApprovals,
  sanitizeCoreMessagesForToolApprovals,
  sanitizeToolApprovalResponsePart
} from '../../../../server/api/chat/sanitize-tool-approval'
import { normalizeMessagesForSdk } from '../../../../server/utils/chat/turn-executor'

describe('sanitizeToolApprovalResponsePart', () => {
  it('maps toolCallId to approvalId and coerces approved', () => {
    expect(
      sanitizeToolApprovalResponsePart({
        type: 'tool-approval-response',
        toolCallId: 'call_1',
        approved: 'true',
        reason: { nested: true }
      })
    ).toEqual({
      type: 'tool-approval-response',
      approvalId: 'call_1',
      toolCallId: 'call_1',
      approved: true
    })
  })

  it('drops irreparable approval responses', () => {
    expect(
      sanitizeToolApprovalResponsePart({
        type: 'tool-approval-response',
        approved: true
      })
    ).toBeNull()

    expect(
      sanitizeToolApprovalResponsePart({
        type: 'tool-approval-response',
        approvalId: 'call_1'
      })
    ).toBeNull()
  })

  it('keeps valid string reasons', () => {
    expect(
      sanitizeToolApprovalResponsePart({
        type: 'tool-approval-response',
        approvalId: 'call_1',
        approved: false,
        reason: 'No thanks'
      })
    ).toMatchObject({
      approvalId: 'call_1',
      approved: false,
      reason: 'No thanks'
    })
  })
})

describe('sanitizeChatMessagesForToolApprovals', () => {
  it('sanitizes tool approval responses on client chat messages', () => {
    const result = sanitizeChatMessagesForToolApprovals([
      {
        id: 'tool-1',
        role: 'tool',
        parts: [
          {
            type: 'tool-approval-response',
            toolCallId: 'call_1',
            approved: 'yes'
          },
          {
            type: 'tool-approval-response',
            approved: true
          }
        ]
      }
    ])

    expect(result[0].parts).toEqual([
      {
        type: 'tool-approval-response',
        approvalId: 'call_1',
        toolCallId: 'call_1',
        approved: true
      }
    ])
  })

  it('repairs assistant approval objects missing ids', () => {
    const result = sanitizeChatMessagesForToolApprovals([
      {
        id: 'assistant-1',
        role: 'assistant',
        parts: [
          {
            type: 'tool-log_meal',
            toolCallId: 'call_1',
            state: 'approval-responded',
            input: { meal: 'oats' },
            approval: { approved: 'true', reason: { bad: true } }
          }
        ]
      }
    ])

    expect(result[0].parts[0]).toMatchObject({
      toolCallId: 'call_1',
      approval: {
        id: 'call_1',
        approved: true
      }
    })
    expect(result[0].parts[0].approval).not.toHaveProperty('reason')
  })
})

describe('sanitizeCoreMessagesForToolApprovals', () => {
  it('drops invalid model-message tool-approval-response parts', () => {
    const result = sanitizeCoreMessagesForToolApprovals([
      {
        role: 'tool',
        content: [
          { type: 'tool-approval-response', approved: true },
          { type: 'tool-approval-response', approvalId: 'call_1', approved: true }
        ]
      }
    ])

    expect(result).toEqual([
      {
        role: 'tool',
        content: [
          {
            type: 'tool-approval-response',
            approvalId: 'call_1',
            toolCallId: 'call_1',
            approved: true
          }
        ]
      }
    ])
  })

  it('removes tool messages that become empty after sanitization', () => {
    const result = sanitizeCoreMessagesForToolApprovals([
      {
        role: 'tool',
        content: [{ type: 'tool-approval-response', approved: true }]
      },
      { role: 'user', content: 'hello' }
    ])

    expect(result).toEqual([{ role: 'user', content: 'hello' }])
  })
})

describe('normalizeMessagesForSdk with tool approval sanitization', () => {
  it('accepts toolCallId-only approval responses and marks the assistant call', () => {
    const result = normalizeMessagesForSdk([
      {
        id: 'assistant-1',
        role: 'assistant',
        parts: [
          {
            type: 'tool-log_meal',
            toolCallId: 'call_1',
            state: 'approval-requested',
            input: { meal: 'oats' },
            approval: { id: 'call_1' }
          }
        ]
      },
      {
        id: 'tool-1',
        role: 'tool',
        parts: [
          {
            type: 'tool-approval-response',
            toolCallId: 'call_1',
            approved: 'true',
            reason: { nested: true }
          }
        ]
      }
    ])

    expect(result[0].parts[0]).toMatchObject({
      state: 'approval-responded',
      approval: {
        id: 'call_1',
        approved: true
      }
    })
    expect(result[0].parts[0].approval).not.toHaveProperty('reason')
    expect(result[1].parts).toEqual([
      {
        type: 'tool-approval-response',
        approvalId: 'call_1',
        toolCallId: 'call_1',
        approved: true
      }
    ])
  })
})
