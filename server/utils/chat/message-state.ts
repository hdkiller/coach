import { CHAT_TURN_STATUS } from './turns'

function hasMeaningfulContent(content: unknown) {
  return typeof content === 'string' && content.trim().length > 0
}

export function hasVisibleAssistantMetadataArtifacts(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return false
  const normalized = metadata as Record<string, any>

  return (
    (Array.isArray(normalized.toolCalls) && normalized.toolCalls.length > 0) ||
    (Array.isArray(normalized.toolApprovals) && normalized.toolApprovals.length > 0) ||
    (Array.isArray(normalized.toolResults) && normalized.toolResults.length > 0)
  )
}

export function shouldExcludeAssistantMessageFromHistory(message: {
  senderId?: string | null
  content?: string | null
  metadata?: unknown
  turn?: {
    status?: string | null
  } | null
}) {
  if (message.senderId !== 'ai_agent') {
    return false
  }

  const metadata =
    message.metadata && typeof message.metadata === 'object' && !Array.isArray(message.metadata)
      ? (message.metadata as Record<string, any>)
      : {}
  const turnStatus = String(message.turn?.status || metadata.turnStatus || '')
  const isTerminalFailure =
    turnStatus === CHAT_TURN_STATUS.INTERRUPTED || turnStatus === CHAT_TURN_STATUS.FAILED

  if (!isTerminalFailure) {
    return false
  }

  if (metadata.hiddenBecauseEmptyFailure) {
    return true
  }

  return !hasMeaningfulContent(message.content) && !hasVisibleAssistantMetadataArtifacts(metadata)
}
