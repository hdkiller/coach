import { describe, expect, it } from 'vitest'
import {
  boundMessagesForModel,
  buildPersistedToolCalls,
  estimateTokenCount,
  expandStoredChatMessages,
  truncateMessages
} from './history'

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
              toolCallId: 'call-1',
              rawToolCall: {
                type: 'tool-call',
                toolCallId: 'call-1',
                toolName: 'get_planned_workouts',
                input: { start_date: '2026-02-28', end_date: '2026-02-28' },
                thoughtSignature: 'signed-part'
              }
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

    expect(expanded!.role).toBe('assistant')
    expect(expanded!.parts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'tool-get_planned_workouts',
          toolCallId: 'call-1',
          state: 'output-available',
          input: { start_date: '2026-02-28', end_date: '2026-02-28' },
          output: { count: 1 },
          toolCall: expect.objectContaining({
            toolCallId: 'call-1',
            toolName: 'get_planned_workouts',
            thoughtSignature: 'signed-part'
          })
        })
      ])
    )
  })

  it('emits a single tool part when legacy toolApprovals duplicate a stored tool call', () => {
    const [expanded] = expandStoredChatMessages([
      {
        id: 'msg-legacy',
        senderId: 'ai_agent',
        content: '',
        createdAt: new Date('2026-02-28T08:29:08.009Z'),
        metadata: {
          toolApprovals: [
            { toolCallId: 'call-1', name: 'log_meal', args: { meal: 'oats' }, approvalId: 'call-1' }
          ],
          toolCalls: [
            {
              type: 'tool-call',
              toolCallId: 'call-1',
              toolName: 'log_meal',
              args: { meal: 'oats' },
              response: { success: true }
            }
          ]
        }
      }
    ])

    const toolParts = (expanded!.parts as any[]).filter((part) => part.type.startsWith('tool-'))

    expect(toolParts).toHaveLength(1)
    expect(toolParts[0]).toMatchObject({
      toolCallId: 'call-1',
      state: 'output-available',
      output: { success: true }
    })
  })

  it('merges tool calls and results into the persisted metadata shape', () => {
    const persisted = buildPersistedToolCalls(
      [
        {
          type: 'tool-call',
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
        response: { local_time: '09:29' },
        rawToolCall: expect.objectContaining({
          toolCallId: 'call-2',
          toolName: 'get_current_time'
        })
      })
    ])
  })

  it('removes runtime-only values from persisted tool metadata', () => {
    const persisted = buildPersistedToolCalls(
      [
        {
          type: 'tool-call',
          toolCallId: 'call-runtime-metadata',
          toolName: 'set_planned_workout_structure',
          input: { workout_id: 'workout-1' },
          providerMetadata: {
            google: { thoughtSignature: 'signed-part' },
            validation: {
              addIssue: () => undefined,
              optionalValue: undefined
            }
          }
        }
      ],
      []
    )

    expect(persisted).toEqual([
      expect.objectContaining({
        toolCallId: 'call-runtime-metadata',
        name: 'set_planned_workout_structure',
        rawToolCall: expect.objectContaining({
          providerMetadata: {
            google: { thoughtSignature: 'signed-part' },
            validation: {}
          }
        })
      })
    ])
    expect(() => JSON.stringify(persisted)).not.toThrow()
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

    expect(expanded!.parts).toEqual([])
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

    expect(expanded!.parts).toEqual([
      expect.objectContaining({
        type: 'tool-ticket_update',
        toolCallId: 'call-1',
        state: 'approval-requested',
        input: { status: 'closed' },
        approval: { id: 'approval-1' }
      })
    ])
    expect(expanded!.metadata.updatedAt).toEqual(new Date('2026-03-10T20:15:10.000Z'))
  })
})

describe('boundMessagesForModel', () => {
  it('drops complete oldest turns when serialized tool payloads exceed the budget', () => {
    const messages = [
      { role: 'user', content: 'old question' },
      {
        role: 'assistant',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'old-call',
            result: { samples: Array.from({ length: 2_000 }, (_, index) => index) }
          }
        ]
      },
      { role: 'user', content: 'new question' },
      { role: 'assistant', content: 'recent answer' },
      { role: 'user', content: 'latest request' }
    ]

    const bounded = boundMessagesForModel(messages, {
      maxMessages: 20,
      maxEstimatedTokens: 1_000
    })

    expect(bounded[0]).toEqual({ role: 'user', content: 'new question' })
    expect(bounded.at(-1)).toEqual({ role: 'user', content: 'latest request' })
    expect(estimateTokenCount(bounded)).toBeLessThan(1_000)
  })

  it('preserves small histories unchanged', () => {
    const messages = [
      { role: 'user', content: 'How was my ride?' },
      { role: 'assistant', content: 'It was steady.' }
    ]
    expect(boundMessagesForModel(messages)).toEqual(messages)
  })
})
