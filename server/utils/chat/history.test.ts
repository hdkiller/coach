import { describe, expect, it } from 'vitest'
import { buildPersistedToolCalls, expandStoredChatMessages, truncateMessages } from './history'

describe('chat history helpers', () => {
  it('reconstructs assistant tool parts from stored toolCalls and toolResults', () => {
    const [expanded] = expandStoredChatMessages([
      {
        id: 'msg-1',
        senderId: 'ai_agent',
        content: ' ',
        createdAt: new Date('2026-02-28T08:29:08.009Z'),
        metadata: {
          toolCalls: [
            {
              type: 'tool-call',
              input: { start_date: '2026-02-28', end_date: '2026-02-28' },
              toolName: 'get_planned_workouts',
              toolCallId: 'call-1'
            }
          ],
          toolResults: [
            {
              type: 'tool-result',
              input: { start_date: '2026-02-28', end_date: '2026-02-28' },
              output: { count: 1 },
              toolName: 'get_planned_workouts',
              toolCallId: 'call-1'
            }
          ]
        }
      }
    ])

    expect(expanded.role).toBe('assistant')
    expect(expanded.parts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'tool-get_planned_workouts',
          toolCallId: 'call-1',
          state: 'output-available',
          input: { start_date: '2026-02-28', end_date: '2026-02-28' },
          output: { count: 1 }
        })
      ])
    )
  })

  it('merges tool calls and results into the persisted metadata shape', () => {
    const persisted = buildPersistedToolCalls(
      [
        {
          toolCallId: 'call-2',
          toolName: 'get_current_time',
          input: {}
        }
      ],
      [
        {
          toolCallId: 'call-2',
          toolName: 'get_current_time',
          output: { local_time: '09:29' }
        }
      ]
    )

    expect(persisted).toEqual([
      expect.objectContaining({
        toolCallId: 'call-2',
        name: 'get_current_time',
        args: {},
        response: { local_time: '09:29' }
      })
    ])
  })

  it('backs up truncation to the previous user turn when a retained window would start with assistant tool calls', () => {
    const result = truncateMessages(
      [
        { id: 'u1', role: 'user', content: 'Need help' },
        {
          id: 'a1',
          role: 'assistant',
          content: [{ type: 'tool-call', toolCallId: 'call-1', toolName: 'lookup', args: {} }]
        },
        {
          id: 't1',
          role: 'tool',
          content: [{ type: 'tool-result', toolCallId: 'call-1', result: { ok: true } }]
        },
        { id: 'u2', role: 'user', content: 'Thanks' }
      ],
      3
    )

    expect(result.map((message) => message.id)).toEqual(['u1', 'a1', 't1', 'u2'])
  })

  it('backs up truncation to the previous user turn when a retained window would start with assistant text', () => {
    const result = truncateMessages(
      [
        { id: 'u1', role: 'user', content: 'Question' },
        { id: 'a1', role: 'assistant', content: 'Answer' },
        { id: 'u2', role: 'user', content: 'Follow-up' }
      ],
      2
    )

    expect(result.map((message) => message.id)).toEqual(['u1', 'a1', 'u2'])
  })

  it('does not inject interrupted fallback text for hidden empty failure drafts', () => {
    const [expanded] = expandStoredChatMessages([
      {
        id: 'msg-hidden',
        senderId: 'ai_agent',
        content: ' ',
        createdAt: new Date('2026-03-10T20:14:54.000Z'),
        metadata: {
          turnStatus: 'INTERRUPTED',
          hiddenBecauseEmptyFailure: true
        }
      }
    ])

    expect(expanded.parts).toEqual([])
  })

  it('keeps interrupted assistant drafts visible when they have tool approval artifacts', () => {
    const [expanded] = expandStoredChatMessages([
      {
        id: 'msg-approval',
        senderId: 'ai_agent',
        content: ' ',
        createdAt: new Date('2026-03-10T20:14:54.000Z'),
        updatedAt: new Date('2026-03-10T20:15:10.000Z'),
        metadata: {
          turnStatus: 'INTERRUPTED',
          hiddenBecauseEmptyFailure: true,
          toolApprovals: [
            {
              approvalId: 'approval-1',
              toolCallId: 'call-1',
              name: 'ticket_update',
              args: { status: 'closed' }
            }
          ]
        }
      }
    ])

    expect(expanded.parts).toEqual([
      expect.objectContaining({
        type: 'tool-ticket_update',
        toolCallId: 'call-1',
        state: 'approval-requested',
        input: { status: 'closed' },
        approval: { id: 'approval-1' }
      })
    ])
    expect(expanded.metadata.updatedAt).toEqual(new Date('2026-03-10T20:15:10.000Z'))
  })
})
