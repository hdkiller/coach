import { describe, expect, it } from 'vitest'
import {
  buildApprovedContinuationConfirmation,
  getHardcodedChatProviderOptions,
  buildWriteRepairSystemInstruction,
  buildTurnExecutionSkillConfig,
  findApprovedToolContinuation,
  normalizeMessagesForSdk,
  shouldUseWriteRepairPrompt
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

describe('buildApprovedContinuationConfirmation', () => {
  it('uses the tool message and totals for a local confirmation', () => {
    const result = buildApprovedContinuationConfirmation('patch_nutrition_items', {
      message: 'Successfully updated 3 item(s) in lunch.',
      totals: {
        calories: 2813,
        carbs: 393,
        protein: 125,
        fat: 77,
        water_ml: 2150
      }
    })

    expect(result).toContain('Successfully updated 3 item(s) in lunch.')
    expect(result).toContain('2813 kcal')
    expect(result).toContain('393g carbs')
    expect(result).toContain('125g protein')
    expect(result).toContain('77g fat')
    expect(result).toContain('2150ml water')
  })

  it('falls back to a generic completion message', () => {
    expect(buildApprovedContinuationConfirmation('patch_nutrition_items', {})).toBe(
      'Completed patch nutrition items.'
    )
  })
})

describe('write repair prompt helpers', () => {
  it('hardcodes chat thinking settings for flash and pro tiers', () => {
    expect(getHardcodedChatProviderOptions('flash', 'gemini-2.5-flash')).toEqual({
      google: {
        thinkingConfig: {
          thinkingBudget: 2000,
          includeThoughts: true
        }
      }
    })

    expect(getHardcodedChatProviderOptions('pro', 'gemini-3-pro-preview')).toEqual({
      google: {
        thinkingConfig: {
          thinkingLevel: 'high',
          includeThoughts: true
        }
      }
    })
  })

  it('uses the stricter retry prompt for tool-enabled write skills', () => {
    expect(
      shouldUseWriteRepairPrompt({
        skillIds: ['planning_write'],
        confidence: 1,
        useTools: true
      } as any)
    ).toBe(true)

    expect(
      shouldUseWriteRepairPrompt({
        skillIds: ['planning_read'],
        confidence: 1,
        useTools: true
      } as any)
    ).toBe(false)
  })

  it('adds strict tool-or-clarify repair instructions', () => {
    const result = buildWriteRepairSystemInstruction('BASE')

    expect(result).toContain('Empty-Response Repair Rules')
    expect(result).toContain('Emit the relevant tool call now')
    expect(result).toContain('Ask exactly one blocking clarification question')
    expect(result).toContain('Do not answer with general prose')
  })
})
