import { CHAT_TURN_STATUS } from './turns'

function hasMeaningfulContent(content: unknown) {
  return typeof content === 'string' && content.trim().length > 0
}

export function hasVisibleAssistantMetadataArtifacts(
  metadata: Record<string, any> | null | undefined
) {
  if (!metadata) return false

  return (
    (Array.isArray(metadata.toolCalls) && metadata.toolCalls.length > 0) ||
    (Array.isArray(metadata.toolApprovals) && metadata.toolApprovals.length > 0) ||
    (Array.isArray(metadata.toolResults) && metadata.toolResults.length > 0)
  )
}

export function shouldExcludeAssistantMessageFromHistory(message: {
  senderId?: string | null
  content?: string | null
  metadata?: Record<string, any> | null
  turn?: {
    status?: string | null
  } | null
}) {
  if (message.senderId !== 'ai_agent') {
    return false
  }

  const metadata = (message.metadata || {}) as Record<string, any>
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
