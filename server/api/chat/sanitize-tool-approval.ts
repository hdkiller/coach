/**
 * Vercel AI SDK ModelMessage schema requires tool-approval-response parts to be:
 *   { type: 'tool-approval-response', approvalId: string, approved: boolean, reason?: string }
 *
 * Client/UI payloads often send `toolCallId` instead of `approvalId`, stringy `approved`
 * values, or non-string `reason` objects. Those fail `standardizePrompt` with
 * AI_TypeValidationError ("expected \"tool-approval-response\"").
 */

function getMessageParts(message: any): any[] {
  if (Array.isArray(message?.parts)) return message.parts
  if (Array.isArray(message?.content)) return message.content
  return []
}

function withMessageParts(message: any, parts: any[]) {
  if (Array.isArray(message?.parts)) {
    return { ...message, parts }
  }
  if (Array.isArray(message?.content)) {
    return { ...message, content: parts }
  }
  return { ...message, parts }
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function asOptionalReason(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function coerceApproved(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (value === 'true' || value === 1 || value === '1') return true
  if (value === 'false' || value === 0 || value === '0') return false
  if (value == null) return null
  return !!value
}

/**
 * Normalize a single tool-approval-response content/part item.
 * Returns null when the part cannot be made schema-valid and should be dropped.
 */
export function sanitizeToolApprovalResponsePart(part: any): Record<string, any> | null {
  if (!part || part.type !== 'tool-approval-response') return part

  const approvalId =
    asNonEmptyString(part.approvalId) ||
    asNonEmptyString(part.toolCallId) ||
    asNonEmptyString(part.approval?.id)

  const approved = coerceApproved(part.approved)
  if (!approvalId || approved == null) {
    return null
  }

  const reason = asOptionalReason(part.reason) ?? asOptionalReason(part.result)
  const sanitized: Record<string, any> = {
    type: 'tool-approval-response',
    approvalId,
    approved
  }

  // Keep toolCallId for our continuation matchers; SDK ModelMessage schema ignores extras
  // on some paths, and UI history still keys off it.
  const toolCallId = asNonEmptyString(part.toolCallId) || approvalId
  sanitized.toolCallId = toolCallId

  if (reason !== undefined) {
    sanitized.reason = reason
  }

  if (typeof part.providerExecuted === 'boolean') {
    sanitized.providerExecuted = part.providerExecuted
  }

  return sanitized
}

function sanitizeAssistantToolApprovalPart(part: any): any {
  if (!part?.type?.startsWith?.('tool-') || !part.approval) return part

  const approvalId =
    asNonEmptyString(part.approval.id) ||
    asNonEmptyString(part.approvalId) ||
    asNonEmptyString(part.toolCallId)

  if (!approvalId) {
    // Approval object without an id leaks into convertToModelMessages as a
    // tool-approval-response missing approvalId, which crashes standardizePrompt.
    const { approval: _approval, ...rest } = part
    if (rest.state === 'approval-responded' || rest.state === 'approval-requested') {
      return { ...rest, state: 'input-available' }
    }
    return rest
  }

  const approved =
    part.approval.approved == null
      ? undefined
      : (coerceApproved(part.approval.approved) ?? undefined)
  const reason = asOptionalReason(part.approval.reason)

  const approval: Record<string, any> = {
    ...part.approval,
    id: approvalId
  }

  if (approved !== undefined) {
    approval.approved = approved
  }

  if (reason !== undefined) {
    approval.reason = reason
  } else if ('reason' in approval && typeof approval.reason !== 'string') {
    delete approval.reason
  }

  return {
    ...part,
    approvalId: asNonEmptyString(part.approvalId) || approvalId,
    toolCallId: asNonEmptyString(part.toolCallId) || approvalId,
    approval
  }
}

/**
 * Sanitize UI/chat messages so tool approval responses conform to the AI SDK schema
 * before persistence or convertToModelMessages / standardizePrompt.
 */
export function sanitizeChatMessagesForToolApprovals(messages: any[]): any[] {
  if (!Array.isArray(messages)) return []

  return messages.map((message) => {
    if (!message || typeof message !== 'object') return message

    const parts = getMessageParts(message)
    if (parts.length === 0) return message

    if (message.role === 'tool') {
      const sanitizedParts = parts
        .map((part) =>
          part?.type === 'tool-approval-response' ? sanitizeToolApprovalResponsePart(part) : part
        )
        .filter((part) => part != null)

      return withMessageParts(message, sanitizedParts)
    }

    if (message.role === 'assistant') {
      const sanitizedParts = parts.map((part) => sanitizeAssistantToolApprovalPart(part))
      return withMessageParts(message, sanitizedParts)
    }

    return message
  })
}

/**
 * Drop or repair tool-approval-response parts already present on ModelMessage[] prompts.
 */
export function sanitizeCoreMessagesForToolApprovals(messages: any[]): any[] {
  if (!Array.isArray(messages)) return []

  return messages
    .map((message) => {
      if (message?.role !== 'tool' || !Array.isArray(message.content)) return message

      const content = message.content
        .map((part: any) =>
          part?.type === 'tool-approval-response' ? sanitizeToolApprovalResponsePart(part) : part
        )
        .filter((part: any) => part != null)

      if (content.length === 0) return null

      return { ...message, content }
    })
    .filter((message) => message != null)
}
