import { describe, expect, it } from 'vitest'
import {
  buildToolIdempotencyKey,
  CHAT_TURN_EXECUTION_TIMEOUT_MS,
  CHAT_TURN_HEARTBEAT_TIMEOUT_MS,
  CHAT_TURN_TIMEOUT_REASON,
  CHAT_TURN_SLOW_RESPONSE_THRESHOLD_MS,
  CHAT_TURN_STATUS,
  hashToolArgs,
  isActiveChatTurnStatus,
  isMutatingChatTool,
  isTerminalChatTurnStatus,
  stableStringify
} from '../../../../server/utils/chat/turns'

describe('chat turn helpers', () => {
  it('stableStringify is order independent for object keys', () => {
    expect(stableStringify({ b: 2, a: 1 })).toBe(stableStringify({ a: 1, b: 2 }))
  })

  it('hashToolArgs is stable for semantically identical objects', () => {
    expect(hashToolArgs({ b: [2, 3], a: 1 })).toBe(hashToolArgs({ a: 1, b: [2, 3] }))
  })

  it('builds deterministic idempotency keys', () => {
    expect(buildToolIdempotencyKey('lineage-1', 'create_planned_workout', 'abc123')).toBe(
      'lineage-1:create_planned_workout:abc123'
    )
  })

  it('classifies active and terminal statuses correctly', () => {
    expect(isActiveChatTurnStatus(CHAT_TURN_STATUS.QUEUED)).toBe(true)
    expect(isActiveChatTurnStatus(CHAT_TURN_STATUS.INTERRUPTED)).toBe(false)
    expect(isTerminalChatTurnStatus(CHAT_TURN_STATUS.INTERRUPTED)).toBe(true)
    expect(isTerminalChatTurnStatus(CHAT_TURN_STATUS.RUNNING)).toBe(false)
  })

  it('detects mutating chat tools', () => {
    expect(isMutatingChatTool('create_planned_workout')).toBe(true)
    expect(isMutatingChatTool('log_nutrition_meal')).toBe(true)
    expect(isMutatingChatTool('log_hydration_intake')).toBe(true)
    expect(isMutatingChatTool('lock_meal_to_plan')).toBe(true)
    expect(isMutatingChatTool('ticket_update')).toBe(true)
    expect(isMutatingChatTool('get_workout_details')).toBe(false)
  })

  it('exposes explicit timeout reasons for chat turn diagnostics', () => {
    expect(CHAT_TURN_TIMEOUT_REASON.SLOW_RESPONSE).toBe('slow_response')
    expect(CHAT_TURN_TIMEOUT_REASON.FIRST_OUTPUT_TIMEOUT).toBe('first_output_timeout')
    expect(CHAT_TURN_TIMEOUT_REASON.EXECUTION_TIMEOUT).toBe('execution_timeout')
    expect(CHAT_TURN_TIMEOUT_REASON.HEARTBEAT_TIMEOUT).toBe('heartbeat_timeout')
  })

  it('keeps product and infrastructure timeout budgets separate', () => {
    expect(CHAT_TURN_SLOW_RESPONSE_THRESHOLD_MS).toBe(15_000)
    expect(CHAT_TURN_EXECUTION_TIMEOUT_MS).toBe(60_000)
    expect(CHAT_TURN_HEARTBEAT_TIMEOUT_MS).toBe(120_000)
    expect(CHAT_TURN_HEARTBEAT_TIMEOUT_MS).toBeGreaterThan(CHAT_TURN_EXECUTION_TIMEOUT_MS)
  })
})
