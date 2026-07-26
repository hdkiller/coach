import { beforeEach, describe, expect, it, vi } from 'vitest'

const { dispatchTaskMock } = vi.hoisted(() => ({
  dispatchTaskMock: vi.fn()
}))

vi.mock('../task-dispatcher', () => ({
  dispatchTask: dispatchTaskMock
}))

const {
  buildApprovedContinuationConfirmation,
  buildEmptyResponseFallbackFromToolResults,
  buildReadRepairSystemInstruction,
  getHardcodedChatProviderOptions,
  buildWriteRepairSystemInstruction,
  buildTurnExecutionSkillConfig,
  findApprovedToolContinuation,
  hasSuccessfulMutatingToolResult,
  normalizeMessagesForSdk,
  scheduleChatRoomSummaryIfNeeded,
  shouldScheduleChatRoomSummary,
  shouldUseReadRepairPrompt,
  shouldUseWriteRepairPrompt,
  shouldRetryEmptyToolResponse
} = await import('./turn-executor')

beforeEach(() => {
  dispatchTaskMock.mockReset()
  dispatchTaskMock.mockResolvedValue({ id: 'run_123' })
})

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
          thinkingLevel: 'low',
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

  it('uses the read repair prompt for tool-enabled read skills', () => {
    expect(
      shouldUseReadRepairPrompt({
        skillIds: ['planning_read'],
        confidence: 1,
        useTools: true
      } as any)
    ).toBe(true)

    expect(
      shouldUseReadRepairPrompt({
        skillIds: ['planning_write'],
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

  it('adds read-turn repair instructions that require textual answers', () => {
    const result = buildReadRepairSystemInstruction('BASE')

    expect(result).toContain('Empty-Response Repair Rules')
    expect(result).toContain('tool-enabled read turn')
    expect(result).toContain('MUST produce a clear textual answer')
    expect(result).toContain('Do not end the turn with only tool calls')
    expect(result).toContain('prose coaching reply')
    expect(result).toContain('get_workout_analysis')
  })

  it('synthesizes a planned-workout fallback from successful tool results', () => {
    const result = buildEmptyResponseFallbackFromToolResults([
      {
        toolName: 'get_planned_workout_details',
        result: {
          success: true,
          title: 'Course à pied - Endurance',
          type: 'Run',
          date: '2026-07-17',
          duration_minutes: 60,
          tss: 64,
          description: "Sortie d'endurance fondamentale."
        }
      },
      {
        toolName: 'get_planned_workout_structure',
        result: {
          success: true,
          structured_workout: {
            steps: [
              {
                name: 'Échauffement progressif',
                durationSeconds: 600,
                targetSplit: 'Stay easy in Z1.'
              },
              {
                name: 'Endurance Fondamentale',
                durationSeconds: 2700,
                targetSplit: 'Hold Z2 endurance.'
              }
            ]
          }
        }
      }
    ])

    expect(result).toContain('Course à pied - Endurance')
    expect(result).toContain('Duration: 60 min')
    expect(result).toContain('Échauffement progressif (10 min)')
    expect(result).toContain('Hold Z2 endurance.')
  })

  it('synthesizes a workout-analysis fallback from successful structured results', () => {
    const result = buildEmptyResponseFallbackFromToolResults([
      {
        toolName: 'get_workout_analysis',
        result: {
          id: '5835e6e9-39b0-48da-a33d-ae7206408c63',
          title: 'Afternoon Ride',
          date: '2026-07-18',
          overallScore: 6,
          effortScore: 9,
          pacingScore: 5,
          aiAnalysisJson: {
            executive_summary: 'A strong effort with a significant late-session fade.',
            strengths: ['High peak power'],
            weaknesses: ['Power declined late in the ride'],
            recommendations: [
              {
                title: 'Start more conservatively',
                description: 'Reduce the opening interval targets by 5-7%.'
              }
            ]
          }
        }
      }
    ])

    expect(result).toContain('## Afternoon Ride')
    expect(result).toContain('A strong effort with a significant late-session fade.')
    expect(result).toContain('Overall: 6/10')
    expect(result).toContain('Effort: 9/10')
    expect(result).toContain('High peak power')
    expect(result).toContain('Start more conservatively')
    expect(result).not.toContain('response issue')
  })

  it('uses legacy workout-analysis markdown when structured analysis is unavailable', () => {
    const result = buildEmptyResponseFallbackFromToolResults([
      {
        toolName: 'get_workout_analysis',
        result: {
          title: 'Morning Run',
          date: '2026-07-19',
          aiAnalysis: '# Analysis\n\nWell-paced aerobic session.'
        }
      }
    ])

    expect(result).toContain('## Morning Run')
    expect(result).toContain('Well-paced aerobic session.')
  })

  it('explains missing workout analysis instead of returning null', () => {
    const result = buildEmptyResponseFallbackFromToolResults([
      {
        toolName: 'get_workout_analysis',
        result: {
          title: 'VO2Max Sharpener',
          date: '2026-07-23',
          aiAnalysisStatus: 'NOT_STARTED',
          aiAnalysisJson: null,
          aiAnalysis: null
        }
      }
    ])

    expect(result).toContain('VO2Max Sharpener')
    expect(result).toContain('not available yet')
    expect(result).toContain('raw session metrics')
  })

  it('explains in-progress workout analysis', () => {
    const result = buildEmptyResponseFallbackFromToolResults([
      {
        toolName: 'get_workout_analysis',
        result: {
          title: 'Afternoon Ride',
          date: '2026-07-22',
          aiAnalysisStatus: 'PENDING'
        }
      }
    ])

    expect(result).toContain('still generating')
  })

  it('builds a concise fallback for completed workout details', () => {
    const result = buildEmptyResponseFallbackFromToolResults([
      {
        toolName: 'get_workout_details',
        result: {
          title: 'Evening Ride',
          date: '2026-07-19',
          type: 'Ride',
          durationSec: 5400,
          tss: 82,
          intensity: 0.78,
          rpe: 7,
          notes: 'Steady endurance work with a strong finish.'
        }
      }
    ])

    expect(result).toContain('## Evening Ride')
    expect(result).toContain('90 min')
    expect(result).toContain('TSS: 82')
    expect(result).toContain('Steady endurance work')
  })

  it('confirms a successful mutation and prevents an empty-response model retry', () => {
    const completedWrite = [
      {
        toolName: 'record_wellness_event',
        args: { category: 'FATIGUE', severity: 7, description: 'Very tired today' },
        result: {
          message: 'Successfully logged fatigue event.',
          event: { id: 'event-1', category: 'FATIGUE', severity: 7 }
        }
      }
    ]

    expect(hasSuccessfulMutatingToolResult(completedWrite)).toBe(true)
    expect(shouldRetryEmptyToolResponse(0, completedWrite)).toBe(false)
    expect(buildEmptyResponseFallbackFromToolResults(completedWrite)).toBe(
      'Successfully logged fatigue event.'
    )

    // A model retry could paraphrase these arguments, so it must never be entered.
    expect(
      shouldRetryEmptyToolResponse(0, [
        {
          ...completedWrite[0],
          args: { category: 'FATIGUE', severity: 6, description: 'Feeling exhausted today' }
        }
      ])
    ).toBe(false)
  })

  it('retries a successful read once but returns no fallback when every tool failed', () => {
    expect(
      shouldRetryEmptyToolResponse(0, [
        { toolName: 'get_workout_details', result: { title: 'Morning Run' } }
      ])
    ).toBe(true)
    expect(
      buildEmptyResponseFallbackFromToolResults([
        { toolName: 'get_workout_details', result: { error: 'Workout not found' } },
        { toolName: 'record_wellness_event', result: { success: false, error: 'Failed' } }
      ])
    ).toBeNull()
  })

  it('summarizes workout collections and bounded read-tool messages', () => {
    expect(
      buildEmptyResponseFallbackFromToolResults([
        {
          toolName: 'get_recent_workouts',
          result: {
            count: 1,
            workouts: [
              {
                title: 'Lunch Run',
                date: '2026-07-20',
                sport: 'Run',
                duration: 3600,
                tss: 55
              }
            ]
          }
        }
      ])
    ).toContain('**Lunch Run** — 2026-07-20 · Run · 60 min · TSS 55')

    expect(
      buildEmptyResponseFallbackFromToolResults([
        {
          toolName: 'get_workout_streams',
          result: {
            message: 'Stream access restricted for performance. Use workout details instead.'
          }
        }
      ])
    ).toContain('Stream access restricted')
  })
})

describe('chat room summary scheduling', () => {
  it('schedules summarization for untitled rooms', async () => {
    await expect(
      scheduleChatRoomSummaryIfNeeded({
        roomId: 'room_1',
        userId: 'user_1',
        roomName: 'New Chat',
        roomMetadata: {}
      })
    ).resolves.toBe(true)

    expect(dispatchTaskMock).toHaveBeenCalledWith('summarize-chat', {
      roomId: 'room_1',
      userId: 'user_1'
    })
  })

  it('schedules summarization when metadata is still missing', async () => {
    expect(
      shouldScheduleChatRoomSummary({
        roomName: 'Half Ironman Build',
        roomMetadata: {
          titleGeneratedAt: '2026-03-17T10:00:00.000Z'
        }
      })
    ).toBe(true)
  })

  it('skips scheduling once title and summary metadata already exist', async () => {
    await expect(
      scheduleChatRoomSummaryIfNeeded({
        roomId: 'room_2',
        userId: 'user_2',
        roomName: 'Half Ironman Build',
        roomMetadata: {
          titleGeneratedAt: '2026-03-17T10:00:00.000Z',
          historySummary: 'User is preparing for a half ironman.',
          lastSummarizedMessageId: 'msg_99'
        }
      })
    ).resolves.toBe(false)

    expect(dispatchTaskMock).not.toHaveBeenCalled()
  })
})
