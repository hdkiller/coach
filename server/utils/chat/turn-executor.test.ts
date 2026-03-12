import { describe, expect, it } from 'vitest'
import {
  buildTurnExecutionSkillConfig,
  findApprovedToolContinuation,
  normalizeMessagesForSdk
} from './turn-executor'

describe('normalizeMessagesForSdk', () => {
  it('preserves tool approval response messages while marking the assistant call approved', () => {
    const messages = [
      {
        id: 'assistant-1',
        role: 'assistant',
        parts: [
          {
            type: 'tool-ticket_create',
            toolCallId: 'call_123',
            state: 'approval-requested',
            input: { title: 'foo', description: 'test' },
            approval: { id: 'call_123' }
          }
        ]
      },
      {
        id: 'tool-1',
        role: 'tool',
        parts: [
          {
            type: 'tool-approval-response',
            approvalId: 'call_123',
            toolCallId: 'call_123',
            approved: true,
            reason: 'User confirmed action.'
          }
        ]
      }
    ]

    const result = normalizeMessagesForSdk(messages)

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      role: 'assistant',
      parts: [
        expect.objectContaining({
          toolCallId: 'call_123',
          state: 'approval-responded',
          approval: expect.objectContaining({
            id: 'call_123',
            approved: true,
            reason: 'User confirmed action.'
          })
        })
      ]
    })
    expect(result[1]).toMatchObject({
      role: 'tool',
      parts: [
        expect.objectContaining({
          type: 'tool-approval-response',
          approvalId: 'call_123',
          toolCallId: 'call_123'
        })
      ]
    })
  })
})

describe('buildTurnExecutionSkillConfig', () => {
  it('scopes tools and prompt fragments to the selected skills', async () => {
    const result = await buildTurnExecutionSkillConfig({
      allTools: {
        ticket_create: { needsApproval: async () => true },
        ticket_get: { needsApproval: false },
        get_planned_workouts: { needsApproval: false }
      },
      baseSystemInstruction: 'Base instruction',
      skillSelection: {
        skillIds: ['support'],
        confidence: 0.95,
        useTools: true
      },
      aiRequireToolApproval: true
    })

    expect(result.selectedToolNames).toEqual(['ticket_create', 'ticket_get'])
    expect(result.tools).toMatchObject({
      ticket_create: {},
      ticket_get: {}
    })
    expect(result.tools).not.toHaveProperty('get_planned_workouts')
    expect(result.systemInstruction).toContain('## Support Skill')
    expect(result.systemInstruction).toContain('## Active Approval Rules')
    expect(result.systemInstruction).toContain('`ticket_create`')
  })

  it('keeps the fallback skill tool-free', async () => {
    const result = await buildTurnExecutionSkillConfig({
      allTools: {
        ticket_create: {},
        get_planned_workouts: {}
      },
      baseSystemInstruction: 'Base instruction',
      skillSelection: {
        skillIds: ['general_chat'],
        confidence: 0.2,
        useTools: false,
        usedFallback: true,
        source: 'fallback'
      }
    })

    expect(result.selectedToolNames).toEqual([])
    expect(result.tools).toEqual({})
    expect(result.systemInstruction).toContain('## General Chat Skill')
    expect(result.systemInstruction).not.toContain('Use planning read tools')
  })
})

describe('findApprovedToolContinuation', () => {
  it('finds the approved tool call from the latest tool approval response', () => {
    const result = findApprovedToolContinuation([
      {
        role: 'assistant',
        parts: [
          {
            type: 'tool-create_planned_workout',
            toolCallId: 'call_1',
            input: { date: '2026-03-11' },
            approval: { id: 'call_1' },
            state: 'approval-requested'
          }
        ]
      },
      {
        role: 'tool',
        parts: [
          {
            type: 'tool-approval-response',
            toolCallId: 'call_1',
            approvalId: 'call_1',
            approved: true,
            reason: 'User confirmed action.'
          }
        ]
      }
    ])

    expect(result).toEqual({
      toolCallId: 'call_1',
      toolName: 'create_planned_workout',
      args: { date: '2026-03-11' }
    })
  })
})
