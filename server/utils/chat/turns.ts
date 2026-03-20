import crypto from 'node:crypto'

export const CHAT_TURN_STATUS = {
  RECEIVED: 'RECEIVED',
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  STREAMING: 'STREAMING',
  WAITING_FOR_TOOLS: 'WAITING_FOR_TOOLS',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  INTERRUPTED: 'INTERRUPTED',
  CANCELLED: 'CANCELLED'
} as const

export type ChatTurnStatus = (typeof CHAT_TURN_STATUS)[keyof typeof CHAT_TURN_STATUS]

export const CHAT_TURN_EVENT_TYPE = {
  TURN_STARTED: 'turn_started',
  SLOW_RESPONSE: 'slow_response',
  FIRST_OUTPUT_RECEIVED: 'first_output_received',
  ASSISTANT_TEXT_DELTA: 'assistant_text_delta',
  TOOL_CALL_STARTED: 'tool_call_started',
  TOOL_CALL_COMPLETED: 'tool_call_completed',
  TOOL_CALL_FAILED: 'tool_call_failed',
  TOOL_CALL_REPAIRED: 'tool_call_repaired',
  TURN_FAILED: 'turn_failed',
  TURN_INTERRUPTED: 'turn_interrupted',
  TURN_COMPLETED: 'turn_completed'
} as const

export const CHAT_TOOL_EXECUTION_STATUS = {
  STARTED: 'STARTED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
} as const

export type ChatToolExecutionStatus =
  (typeof CHAT_TOOL_EXECUTION_STATUS)[keyof typeof CHAT_TOOL_EXECUTION_STATUS]

export const ACTIVE_CHAT_TURN_STATUSES: ChatTurnStatus[] = [
  CHAT_TURN_STATUS.RECEIVED,
  CHAT_TURN_STATUS.QUEUED,
  CHAT_TURN_STATUS.RUNNING,
  CHAT_TURN_STATUS.STREAMING,
  CHAT_TURN_STATUS.WAITING_FOR_TOOLS
]

export const TERMINAL_CHAT_TURN_STATUSES: ChatTurnStatus[] = [
  CHAT_TURN_STATUS.COMPLETED,
  CHAT_TURN_STATUS.FAILED,
  CHAT_TURN_STATUS.INTERRUPTED,
  CHAT_TURN_STATUS.CANCELLED
]

export const CHAT_TURN_SLOW_RESPONSE_THRESHOLD_MS = 15 * 1000
export const CHAT_TURN_EXECUTION_TIMEOUT_MS = 60 * 1000
export const CHAT_TURN_HEARTBEAT_TIMEOUT_MS = 120 * 1000

export const CHAT_TURN_TIMEOUT_REASON = {
  SLOW_RESPONSE: 'slow_response',
  FIRST_OUTPUT_TIMEOUT: 'first_output_timeout',
  EXECUTION_TIMEOUT: 'execution_timeout',
  HEARTBEAT_TIMEOUT: 'heartbeat_timeout'
} as const

export type ChatTurnTimeoutReason =
  (typeof CHAT_TURN_TIMEOUT_REASON)[keyof typeof CHAT_TURN_TIMEOUT_REASON]

export type ChatToolExecutionContext = {
  turnId: string
  lineageId: string
  roomId: string
  userId: string
  actorUserId?: string
}

export function isActiveChatTurnStatus(status?: string | null): status is ChatTurnStatus {
  return !!status && ACTIVE_CHAT_TURN_STATUSES.includes(status as ChatTurnStatus)
}

export function isTerminalChatTurnStatus(status?: string | null): status is ChatTurnStatus {
  return !!status && TERMINAL_CHAT_TURN_STATUSES.includes(status as ChatTurnStatus)
}

export function shouldResumeTurn(status?: string | null) {
  return status === CHAT_TURN_STATUS.INTERRUPTED
}

export function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    )
    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

export function hashToolArgs(value: unknown) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex')
}

export function buildToolIdempotencyKey(lineageId: string, toolName: string, argsHash: string) {
  return `${lineageId}:${toolName}:${argsHash}`
}

export function isMutatingChatTool(toolName: string) {
  return (
    toolName === 'log_nutrition_meal' ||
    toolName === 'log_hydration_intake' ||
    toolName === 'lock_meal_to_plan' ||
    toolName.startsWith('create_') ||
    toolName.startsWith('update_') ||
    toolName.startsWith('delete_') ||
    toolName.startsWith('reschedule_') ||
    toolName.startsWith('publish_') ||
    toolName.startsWith('patch_') ||
    toolName.startsWith('sync_') ||
    toolName === 'ticket_comment' ||
    toolName === 'ticket_update' ||
    toolName === 'ticket_create' ||
    toolName === 'report_bug'
  )
}
