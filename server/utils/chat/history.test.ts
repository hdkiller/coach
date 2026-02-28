import { describe, expect, it } from 'vitest'
import { buildPersistedToolCalls, expandStoredChatMessages } from './history'

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
})
