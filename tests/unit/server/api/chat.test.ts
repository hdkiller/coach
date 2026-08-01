import { describe, expect, it } from 'vitest'
import {
  sanitizeChatMessagesForToolApprovals,
  sanitizeCoreMessagesForToolApprovals,
  sanitizeToolApprovalResponsePart
} from '../../../../server/api/chat/sanitize-tool-approval'
import { transformHistoryToCoreMessages } from '../../../../server/utils/ai-history'
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

  it('normalizes bare tool-approval-response parts inside assistant messages (CW-293)', () => {
    const result = sanitizeChatMessagesForToolApprovals([
      {
        id: 'assistant-1',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'Done.' },
          { type: 'tool-approval-response', toolCallId: 'call_1', approved: 'true' },
          { type: 'tool-approval-response', approved: true }
        ]
      }
    ])

    expect(result[0].parts).toEqual([
      { type: 'text', text: 'Done.' },
      {
        type: 'tool-approval-response',
        approvalId: 'call_1',
        toolCallId: 'call_1',
        approved: true
      }
    ])
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

  it('drops tool-approval-response parts from assistant model messages (CW-293)', () => {
    const result = sanitizeCoreMessagesForToolApprovals([
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Done.' },
          { type: 'tool-approval-response', toolCallId: 'call_1', approved: true }
        ]
      },
      {
        role: 'assistant',
        content: [{ type: 'tool-approval-response', toolCallId: 'call_2', approved: false }]
      }
    ])

    expect(result[0].content).toEqual([{ type: 'text', text: 'Done.' }])
    // An assistant message left empty must not reach the provider with no content
    expect(result[1].content).toEqual([{ type: 'text', text: ' ' }])
  })
})

describe('transformHistoryToCoreMessages Date serialization (CW-293)', () => {
  it('serializes Date fields nested in tool-role result payloads', async () => {
    const lastSyncedAt = new Date('2026-07-31T10:00:00.000Z')
    const history = [
      {
        id: '1',
        role: 'assistant',
        content: 'Fetching workout.',
        parts: [
          { type: 'text', text: 'Fetching workout.' },
          {
            type: 'tool-approval-request',
            toolCallId: 'call_pw',
            toolName: 'plannedWorkout',
            args: {}
          }
        ]
      },
      {
        id: '2',
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call_pw',
            toolName: 'plannedWorkout',
            result: {
              workout: {
                lastSyncedAt,
                lastStructureEditedAt: new Date('2026-07-31T11:00:00.000Z'),
                nested: { lastRemoteStructureSeenAt: new Date('2026-07-31T12:00:00.000Z') }
              }
            }
          }
        ]
      }
    ]

    const result = await transformHistoryToCoreMessages(history)

    const toolMsg = result.find((m: any) => m.role === 'tool')
    expect(toolMsg).toBeDefined()
    const output = toolMsg.content[0].output
    expect(output.type).toBe('json')
    expect(output.value.workout.lastSyncedAt).toBe('2026-07-31T10:00:00.000Z')
    expect(output.value.workout.lastStructureEditedAt).toBe('2026-07-31T11:00:00.000Z')
    expect(output.value.workout.nested.lastRemoteStructureSeenAt).toBe('2026-07-31T12:00:00.000Z')
    expect(JSON.stringify(result)).not.toContain('[object Date]')
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
