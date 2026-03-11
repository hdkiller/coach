import { beforeEach, describe, expect, it, vi } from 'vitest'
import { classifyChatSkills, getContinuationSkillSelection, selectToolsForSkills } from './skills'

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
