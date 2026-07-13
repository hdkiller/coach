import { expandStoredChatMessages } from './history'

function hasMeaningfulText(message: { content?: string | null; parts?: any[] }) {
  if (typeof message.content === 'string' && message.content.trim().length > 0) {
    return true
  }

  const parts = Array.isArray(message.parts) ? message.parts : []
  return parts.some(
    (part) => part?.type === 'text' && typeof part.text === 'string' && part.text.trim().length > 0
  )
}

export function shouldIncludeMessageInSharedChat(message: {
  role?: string | null
  metadata?: Record<string, any> | null
  content?: string | null
  parts?: any[]
}) {
  if (message.role === 'tool') {
    return false
  }

  const metadata = message.metadata || {}

  if (metadata.hiddenBecauseEmptyFailure || metadata.hideUntilContent) {
    return false
  }

  if (message.role === 'assistant' && !hasMeaningfulText(message)) {
    const parts = Array.isArray(message.parts) ? message.parts : []
    const hasNonTextParts = parts.some((part) => part?.type && part.type !== 'text')
    if (!hasNonTextParts) {
      return false
    }
  }

  return true
}

export function sanitizeSharedChatMessage(message: any) {
  const textParts = (Array.isArray(message.parts) ? message.parts : []).filter(
    (part: any) => part?.type === 'text' && typeof part.text === 'string'
  )

  return {
    id: message.id,
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: message.content || '',
    parts:
      textParts.length > 0
        ? textParts
        : [{ type: 'text', text: typeof message.content === 'string' ? message.content : '' }],
    createdAt: message.createdAt
  }
}

export function buildSharedChatMessages(messages: any[]) {
  return expandStoredChatMessages(messages)
    .filter((message) => shouldIncludeMessageInSharedChat(message))
    .map((message) => sanitizeSharedChatMessage(message))
}
