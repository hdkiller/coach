import { convertToModelMessages } from 'ai'
import { normalizeCoreMessagesForGemini } from './core-message-normalizer'

/**
 * Truncates message history to stay within a reasonable context window.
 * Ensures that tool calls and their results are kept together.
 */
export function truncateMessages(messages: any[], limit: number = 20): any[] {
  if (messages.length <= limit) return messages

  // 1. Keep the last message (the new user message)
  const lastMessage = messages[messages.length - 1]
  const history = messages.slice(0, -1)

  // 2. Take the last 'limit - 1' messages from history
  const truncatedHistory = history.slice(-(limit - 1))

  // 3. Gemini is strict about turn ordering. If truncation starts inside an
  // assistant/tool exchange, back up until the retained window starts on a user turn.
  while (truncatedHistory.length > 0 && truncatedHistory[0].role !== 'user') {
    const firstMsgIndexInOriginal = history.length - truncatedHistory.length
    if (firstMsgIndexInOriginal > 0) {
      truncatedHistory.unshift(history[firstMsgIndexInOriginal - 1])
    } else {
      break
    }
  }

  // 4. Ensure we don't end with an orphaned tool call that is missing its result
  // (Though the last message is usually the User message, so this is less likely)

  return [...truncatedHistory, lastMessage]
}

/**
 * Calculates a rough token count for messages to help with more precise truncation.
 * (Simplified estimation: 1 token ~= 4 characters for English)
 */
export function estimateTokenCount(messages: any[]): number {
  let count = 0
  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      count += Math.ceil(msg.content.length / 4)
    } else if (Array.isArray(msg.content)) {
      msg.content.forEach((part: any) => {
        if (part.type === 'text') {
          count += Math.ceil(part.text.length / 4)
        } else if (part.type === 'tool-call') {
          count += JSON.stringify(part.args || {}).length / 4
        }
      })
    }
  }
  return count
}

function normalizeStoredToolCalls(metadata: any, messageId?: string) {
  const toolCallMap = new Map<string, any>()

  const register = (entry: any, fallbackId: string) => {
    const toolCallId = entry?.toolCallId || fallbackId
    if (!toolCallId) return

    const existing = toolCallMap.get(toolCallId) || {}
    const response =
      entry?.response !== undefined
        ? entry.response
        : entry?.result !== undefined
          ? entry.result
          : entry?.output !== undefined
            ? entry.output
            : existing.response

    toolCallMap.set(toolCallId, {
      toolCallId,
      name: entry?.name || entry?.toolName || existing.name,
      args: entry?.args ?? entry?.input ?? existing.args ?? {},
      response,
      rawToolCall: entry?.rawToolCall ?? existing.rawToolCall
    })
  }

  if (Array.isArray(metadata?.toolCalls)) {
    metadata.toolCalls.forEach((toolCall: any, index: number) => {
      register(toolCall, `call-${messageId || 'message'}-${index}`)
    })
  }

  if (Array.isArray(metadata?.toolResults)) {
    metadata.toolResults.forEach((toolResult: any, index: number) => {
      register(toolResult, `result-${messageId || 'message'}-${index}`)
    })
  }

  return Array.from(toolCallMap.values()).filter((toolCall) => toolCall.name)
}

export function expandStoredChatMessage(message: any) {
  const turnMetadata = message.turn
    ? {
        turnId: message.turn.id,
        turnStatus: message.turn.status,
        turnFailureReason: message.turn.failureReason,
        turnStartedAt: message.turn.startedAt,
        turnFinishedAt: message.turn.finishedAt,
        ...(message.turn.metadata?.skillSelection
          ? { skillSelection: message.turn.metadata.skillSelection }
          : {})
      }
    : {}
  const metadata = {
    ...((message.metadata as any) || {}),
    ...turnMetadata
  }
  const role =
    message.senderId === 'ai_agent'
      ? 'assistant'
      : message.senderId === 'system_tool'
        ? 'tool'
        : 'user'

  if (role !== 'assistant') {
    const parts: any[] = []

    if (message.content) {
      parts.push({ type: 'text', text: message.content })
    }

    if (Array.isArray(message.files)) {
      message.files.forEach((file: any) => {
        if (!file?.url || !file?.mediaType) return
        parts.push({
          type: 'file',
          url: file.url,
          mediaType: file.mediaType,
          filename: file.filename
        })
      })
    }

    if (Array.isArray(metadata.toolResponse)) {
      metadata.toolResponse.forEach((part: any) => parts.push(part))
    }

    return {
      id: message.id,
      role,
      parts: parts.length > 0 ? parts : undefined,
      content: message.content || '',
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      metadata: {
        ...metadata,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        senderId: message.senderId
      }
    }
  }

  const parts: any[] = []
  const shouldHideEmptyFailure = !!metadata.hiddenBecauseEmptyFailure
  const shouldHideUntilContent = !!metadata.hideUntilContent

  if (Array.isArray(metadata.toolApprovals)) {
    metadata.toolApprovals.forEach((approval: any) => {
      parts.push({
        type: `tool-${approval.name}`,
        toolCallId: approval.toolCallId,
        state: 'approval-requested',
        input: approval.args || {},
        approval: {
          id: approval.approvalId || approval.toolCallId
        }
      })
    })
  }

  // Tool calls stored in pendingApprovals were blocked by needsApproval and never executed.
  // Reconstruct them as approval-requested parts so normalizeMessagesForSdk can match
  // the approval response by approvalId (via part.approval?.id) in continuation turns.
  const pendingApprovalIds = new Set<string>(
    Array.isArray(metadata.pendingApprovals)
      ? metadata.pendingApprovals.map((a: any) => a.toolCallId).filter(Boolean)
      : []
  )

  normalizeStoredToolCalls(metadata, message.id).forEach((toolCall: any) => {
    if (pendingApprovalIds.has(toolCall.toolCallId)) {
      parts.push({
        type: `tool-${toolCall.name}`,
        toolCallId: toolCall.toolCallId,
        state: 'approval-requested',
        input: toolCall.args || {},
        toolCall: toolCall.rawToolCall
          ? {
              ...toolCall.rawToolCall,
              toolCallId: toolCall.rawToolCall.toolCallId || toolCall.toolCallId,
              toolName: toolCall.rawToolCall.toolName || toolCall.name,
              input: toolCall.rawToolCall.input ?? toolCall.rawToolCall.args ?? toolCall.args ?? {},
              args: toolCall.rawToolCall.args ?? toolCall.rawToolCall.input ?? toolCall.args ?? {}
            }
          : undefined,
        approval: {
          id: toolCall.toolCallId
        }
      })
    } else {
      parts.push({
        type: `tool-${toolCall.name}`,
        toolCallId: toolCall.toolCallId,
        state: 'output-available',
        input: toolCall.args || {},
        toolCall: toolCall.rawToolCall
          ? {
              ...toolCall.rawToolCall,
              toolCallId: toolCall.rawToolCall.toolCallId || toolCall.toolCallId,
              toolName: toolCall.rawToolCall.toolName || toolCall.name,
              input: toolCall.rawToolCall.input ?? toolCall.rawToolCall.args ?? toolCall.args ?? {},
              args: toolCall.rawToolCall.args ?? toolCall.rawToolCall.input ?? toolCall.args ?? {}
            }
          : undefined,
        output: toolCall.response
      })
    }
  })

  if (message.content && message.content.trim()) {
    parts.push({ type: 'text', text: message.content })
  } else if (metadata.turnStatus === 'INTERRUPTED' && !shouldHideEmptyFailure) {
    parts.push({ type: 'text', text: 'Response interrupted before completion.' })
  }

  if (parts.length === 0 && !shouldHideEmptyFailure && !shouldHideUntilContent) {
    parts.push({ type: 'text', text: ' ' })
  }

  return {
    id: message.id,
    role: 'assistant',
    parts,
    content: message.content || ' ',
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    metadata: {
      ...metadata,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      senderId: message.senderId
    }
  }
}

export function expandStoredChatMessages(messages: any[]) {
  return messages.map((message) => expandStoredChatMessage(message))
}

export async function buildModelMessagesFromStoredChatMessages(messages: any[], tools: any) {
  const historyMessages = expandStoredChatMessages(messages)
  const coreMessages = await convertToModelMessages(historyMessages as any, { tools: tools as any })
  return normalizeCoreMessagesForGemini(coreMessages)
}

export function buildPersistedToolCalls(toolCalls: any[] = [], toolResults: any[] = []) {
  const toolCallMap = new Map<string, any>()

  const register = (entry: any) => {
    if (!entry?.toolCallId) return

    const existing = toolCallMap.get(entry.toolCallId) || {}
    toolCallMap.set(entry.toolCallId, {
      toolCallId: entry.toolCallId,
      name: entry.name || entry.toolName || existing.name,
      args: entry.args ?? entry.input ?? existing.args ?? {},
      rawToolCall:
        entry.type === 'tool-call'
          ? {
              ...existing.rawToolCall,
              ...entry
            }
          : existing.rawToolCall,
      response:
        entry.response !== undefined
          ? entry.response
          : entry.result !== undefined
            ? entry.result
            : entry.output !== undefined
              ? entry.output
              : existing.response,
      timestamp: existing.timestamp || entry.timestamp || new Date().toISOString()
    })
  }

  toolCalls.forEach((toolCall: any) => register(toolCall))
  toolResults.forEach((toolResult: any) => register(toolResult))

  return Array.from(toolCallMap.values()).filter((toolCall) => toolCall.name)
}
