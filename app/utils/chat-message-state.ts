const TERMINAL_FAILURE_STATUSES = new Set(['INTERRUPTED', 'FAILED'])

function getTextParts(message: any) {
  if (!Array.isArray(message?.parts)) {
    if (typeof message?.content === 'string') {
      return [{ type: 'text', text: message.content }]
    }
    return []
  }

  return message.parts.filter((part: any) => part?.type === 'text')
}

export function hasMeaningfulAssistantText(message: any) {
  return getTextParts(message).some(
    (part: any) => typeof part?.text === 'string' && part.text.trim().length > 0
  )
}

export function hasVisibleAssistantArtifacts(message: any) {
  if (message?.role !== 'assistant') return false
  if (hasMeaningfulAssistantText(message)) return true

  const parts = Array.isArray(message?.parts) ? message.parts : []
  if (parts.some((part: any) => part?.type && part.type !== 'text')) {
    return true
  }

  const metadata = (message?.metadata || {}) as Record<string, any>
  return (
    (Array.isArray(metadata.toolCalls) && metadata.toolCalls.length > 0) ||
    (Array.isArray(metadata.toolApprovals) && metadata.toolApprovals.length > 0) ||
    (Array.isArray(metadata.toolResults) && metadata.toolResults.length > 0)
  )
}

export function shouldHideAssistantBubble(message: any) {
  if (message?.role !== 'assistant') return false

  const metadata = (message?.metadata || {}) as Record<string, any>
  if (hasVisibleAssistantArtifacts(message)) return false

  if (metadata.hiddenBecauseEmptyFailure) {
    return true
  }

  return !!metadata.hideUntilContent
}

export function shouldShowAssistantStatusRow(message: any) {
  if (message?.role !== 'assistant') return false

  const metadata = (message?.metadata || {}) as Record<string, any>
  return TERMINAL_FAILURE_STATUSES.has(String(metadata.turnStatus || ''))
}
