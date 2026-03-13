import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  classifyChatSkills,
  composeSkillInstructions,
  getContinuationSkillSelection,
  getPendingApprovalSkillSelection,
  resolveApprovalToolNamesForSelection,
  selectToolsForSkills
} from './skills'

const generateObjectMock = vi.fn()
const llmUsageCreateMock = vi.fn().mockResolvedValue(null)

vi.mock('ai', () => ({
  generateObject: (...args: any[]) => generateObjectMock(...args)
}))

vi.mock('../db', () => ({
  prisma: {
    llmUsage: {
      create: (...args: any[]) => llmUsageCreateMock(...args)
    }
  }
}))

describe('selectToolsForSkills', () => {
  it('returns only the declared tools for the selected skills', () => {
    const tools = selectToolsForSkills(
      {
        ticket_create: { name: 'ticket_create' },
        ticket_get: { name: 'ticket_get' },
        get_planned_workouts: { name: 'get_planned_workouts' },
        sync_data: { name: 'sync_data' }
      },
      ['support'],
      { useTools: true }
    )

    expect(Object.keys(tools)).toEqual(['ticket_create', 'ticket_get'])
    expect(tools).not.toHaveProperty('get_planned_workouts')
    expect(tools).not.toHaveProperty('sync_data')
  })

  it('returns no tools for the general chat fallback', () => {
    const tools = selectToolsForSkills(
      {
        ticket_create: { name: 'ticket_create' },
        get_planned_workouts: { name: 'get_planned_workouts' }
      },
      ['general_chat'],
      { useTools: false }
    )

    expect(tools).toEqual({})
  })

  it('returns tools for the new profile and availability skills', () => {
    const tools = selectToolsForSkills(
      {
        get_user_profile: { name: 'get_user_profile' },
        update_user_profile: { name: 'update_user_profile' },
        get_training_availability: { name: 'get_training_availability' },
        update_training_availability: { name: 'update_training_availability' },
        ticket_create: { name: 'ticket_create' }
      },
      ['profile', 'availability'],
      { useTools: true }
    )

    expect(Object.keys(tools)).toEqual([
      'get_user_profile',
      'update_user_profile',
      'get_training_availability',
      'update_training_availability'
    ])
    expect(tools).not.toHaveProperty('ticket_create')
  })

  it('preserves helper tools for time and date-aware domains', () => {
    const tools = selectToolsForSkills(
      {
        log_nutrition_meal: { name: 'log_nutrition_meal' },
        get_current_time: { name: 'get_current_time' },
        resolve_temporal_reference: { name: 'resolve_temporal_reference' },
        ticket_create: { name: 'ticket_create' }
      },
      ['nutrition'],
      { useTools: true }
    )

    expect(Object.keys(tools)).toEqual([
      'log_nutrition_meal',
      'get_current_time',
      'resolve_temporal_reference'
    ])
    expect(tools).not.toHaveProperty('ticket_create')
  })
})

describe('classifyChatSkills', () => {
  beforeEach(() => {
    generateObjectMock.mockReset()
    llmUsageCreateMock.mockClear()
  })

  it('normalizes a support routing result for a multilingual ticket prompt', async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: {
        skillIds: ['support'],
        confidence: 0.94,
        useTools: true,
        reason: 'The user wants to create a ticket.'
      },
      usage: {
        inputTokens: 20,
        outputTokens: 5,
        inputTokenDetails: { cacheReadTokens: 0 },
        outputTokenDetails: { reasoningTokens: 0 }
      }
    })

    const selection = await classifyChatSkills({
      userId: 'user-1',
      turnId: 'turn-1',
      messages: [{ role: 'user', content: 'Kerlek hozz letre egy hibajegyet a bejelentkezesrol.' }]
    })

    expect(selection).toMatchObject({
      skillIds: ['support'],
      useTools: true,
      usedFallback: false,
      source: 'router'
    })
    expect(generateObjectMock).toHaveBeenCalledTimes(1)
  })

  it('normalizes a planning read route for upcoming workouts', async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: {
        skillIds: ['planning_read'],
        confidence: 0.88,
        useTools: true,
        reason: 'The user is asking about upcoming planned workouts.'
      },
      usage: {
        inputTokens: 18,
        outputTokens: 6,
        inputTokenDetails: { cacheReadTokens: 0 },
        outputTokenDetails: { reasoningTokens: 0 }
      }
    })

    const selection = await classifyChatSkills({
      userId: 'user-1',
      turnId: 'turn-2',
      messages: [{ role: 'user', content: 'What are my upcoming workouts?' }]
    })

    expect(selection).toMatchObject({
      skillIds: ['planning_read'],
      useTools: true,
      usedFallback: false
    })
  })

  it('falls back safely on low-confidence routing output', async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: {
        skillIds: ['planning_read'],
        confidence: 0.3,
        useTools: true,
        reason: 'Uncertain.'
      },
      usage: {
        inputTokens: 12,
        outputTokens: 4,
        inputTokenDetails: { cacheReadTokens: 0 },
        outputTokenDetails: { reasoningTokens: 0 }
      }
    })

    const selection = await classifyChatSkills({
      userId: 'user-1',
      turnId: 'turn-3',
      messages: [{ role: 'user', content: 'hello there' }]
    })

    expect(selection).toMatchObject({
      skillIds: ['general_chat'],
      useTools: false,
      usedFallback: true,
      source: 'fallback'
    })
  })
})

describe('getContinuationSkillSelection', () => {
  it('reuses the tool skill when continuing an approved tool action', () => {
    const selection = getContinuationSkillSelection([
      {
        role: 'assistant',
        parts: [
          {
            type: 'tool-ticket_create',
            toolCallId: 'call_1',
            state: 'approval-requested',
            approval: { id: 'call_1' }
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
            approved: true
          }
        ]
      }
    ])

    expect(selection).toMatchObject({
      skillIds: ['support'],
      useTools: true,
      source: 'continuation'
    })
  })

  it('does not keep continuation active for later unrelated user turns', () => {
    const selection = getContinuationSkillSelection([
      {
        role: 'assistant',
        parts: [
          {
            type: 'tool-ticket_create',
            toolCallId: 'call_1',
            state: 'approval-requested',
            approval: { id: 'call_1' }
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
            approved: true
          }
        ]
      },
      {
        role: 'user',
        content: 'create a new workout for tomorrow'
      }
    ])

    expect(selection).toBeNull()
  })
})

describe('getPendingApprovalSkillSelection', () => {
  it('keeps the original write skill available when approval is still pending', () => {
    const selection = getPendingApprovalSkillSelection([
      {
        role: 'assistant',
        metadata: {
          pendingApprovals: [
            {
              toolName: 'delete_planned_workout',
              toolCallId: 'call_1'
            }
          ]
        }
      },
      {
        role: 'user',
        content: "I can't see the approve button"
      }
    ])

    expect(selection).toMatchObject({
      useTools: true,
      source: 'pending_approval'
    })
    expect(selection?.skillIds).toEqual(['support', 'planning_write'])
  })
})

describe('resolveApprovalToolNamesForSelection', () => {
  it('derives approval rules from the selected tool definitions', async () => {
    const approvalToolNames = await resolveApprovalToolNamesForSelection(
      {
        ticket_create: { needsApproval: async () => true },
        ticket_get: { needsApproval: false },
        update_workout: { needsApproval: async () => true }
      },
      {
        aiRequireToolApproval: true,
        useTools: true
      }
    )

    expect(approvalToolNames).toEqual(['ticket_create', 'update_workout'])
  })

  it('returns no approval rules when tools are disabled for the turn', async () => {
    const approvalToolNames = await resolveApprovalToolNamesForSelection(
      {
        ticket_create: { needsApproval: async () => true }
      },
      {
        aiRequireToolApproval: true,
        useTools: false
      }
    )

    expect(approvalToolNames).toEqual([])
  })
})

describe('composeSkillInstructions', () => {
  it('falls back to general-chat guidance when the selected domain is tool-free for this turn', () => {
    const instructions = composeSkillInstructions('BASE', ['planning_read'], {
      useTools: false
    })

    expect(instructions).toContain('## General Chat Skill')
    expect(instructions).toContain('Domain context for this turn: planning_read')
    expect(instructions).not.toContain('Use planning read tools')
  })

  it('adds hard execution-integrity rules for tool-enabled turns', () => {
    const instructions = composeSkillInstructions('BASE', ['planning_write', 'support'], {
      useTools: true,
      approvalToolNames: ['delete_planned_workout']
    })

    expect(instructions).toContain('## Execution Integrity Rules')
    expect(instructions).toContain('Never claim that a write action was completed')
    expect(instructions).toContain('If the user reports that approval UI is missing or broken')
    expect(instructions).toContain('use discovery/read tools first to identify the exact target')
    expect(instructions).toContain('Do not finish a tool-enabled turn with zero tool calls')
  })

  it('reinforces discovery-before-mutation in planning and nutrition prompts', () => {
    const planningInstructions = composeSkillInstructions('BASE', ['planning_write'], {
      useTools: true
    })
    const nutritionInstructions = composeSkillInstructions('BASE', ['nutrition'], {
      useTools: true
    })

    expect(planningInstructions).toContain(
      'first use planning read/search tools to identify the exact target record'
    )
    expect(nutritionInstructions).toContain(
      'first inspect the relevant nutrition log to discover the exact item ID'
    )
  })
})
