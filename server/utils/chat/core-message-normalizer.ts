function asParts(content: any): any[] {
  if (Array.isArray(content)) return content
  if (typeof content === 'string') return [{ type: 'text', text: content }]
  return []
}

function extractAssistantToolCalls(message: any): Map<string, string> {
  const toolNamesByCallId = new Map<string, string>()

  for (const part of asParts(message.content)) {
    if (part?.type === 'tool-call' && part.toolCallId) {
      toolNamesByCallId.set(part.toolCallId, part.toolName)
    }
  }

  return toolNamesByCallId
}

function hasThoughtSignature(part: any) {
  return !!(
    part?.providerOptions?.google?.thoughtSignature ||
    part?.providerMetadata?.google?.thoughtSignature
  )
}

/**
 * Gemini rejects a `model` turn that contains two `functionCall` parts with the same id
 * with a bare `400 INVALID_ARGUMENT: Request contains an invalid argument.` Collapse
 * repeated tool calls to a single part, preferring the copy that still carries a
 * thought signature so Gemini 3 does not fall back to the skip-validation sentinel.
 */
function dedupeAssistantToolCalls(content: any[]) {
  const indexByToolCallId = new Map<string, number>()
  const deduped: any[] = []

  for (const part of content) {
    if (part?.type !== 'tool-call' || !part.toolCallId) {
      deduped.push(part)
      continue
    }

    const existingIndex = indexByToolCallId.get(part.toolCallId)
    if (existingIndex === undefined) {
      indexByToolCallId.set(part.toolCallId, deduped.length)
      deduped.push(part)
      continue
    }

    if (!hasThoughtSignature(deduped[existingIndex]) && hasThoughtSignature(part)) {
      deduped[existingIndex] = part
    }
  }

  return deduped
}

/**
 * The adjacency rules above can drop a tool message (for example when another assistant
 * turn was persisted between the call and its canonical result) while the assistant's
 * `tool-call` part survives. The AI SDK rejects that prompt outright with
 * `AI_MissingToolResultsError` before any request is sent, which fails the whole turn.
 *
 * A tool call is only meaningful to the model alongside its result, so drop any call whose
 * result did not survive normalization.
 */
function dropUnresolvedAssistantToolCalls(messages: any[]) {
  const resolvedToolCallIds = new Set<string>()

  for (const msg of messages) {
    if (msg?.role !== 'tool') continue
    for (const part of asParts(msg.content)) {
      if (part?.type === 'tool-result' && part.toolCallId) {
        resolvedToolCallIds.add(part.toolCallId)
      }
    }
  }

  return messages.map((msg) => {
    if (msg?.role !== 'assistant' || !Array.isArray(msg.content)) return msg
    if (!msg.content.some((part: any) => part?.type === 'tool-call')) return msg

    const content = msg.content.filter(
      (part: any) => part?.type !== 'tool-call' || resolvedToolCallIds.has(part.toolCallId)
    )

    if (content.length === msg.content.length) return msg

    return {
      ...msg,
      content: content.length > 0 ? content : [{ type: 'text', text: ' ' }]
    }
  })
}

export function normalizeCoreMessagesForGemini(coreMessages: any[]) {
  const merged: any[] = []

  for (const rawMessage of coreMessages) {
    const msg = Array.isArray(rawMessage?.content)
      ? { ...rawMessage, content: [...rawMessage.content] }
      : { ...rawMessage }
    const last = merged[merged.length - 1]
    const canMerge =
      last && last.role === msg.role && (msg.role === 'user' || msg.role === 'system')

    if (canMerge) {
      if (typeof last.content === 'string' && typeof msg.content === 'string') {
        last.content = `${last.content}\n\n${msg.content}`
      } else {
        last.content = [...asParts(last.content), ...asParts(msg.content)]
      }
      continue
    }

    merged.push(msg)
  }

  const prevalidated: any[] = []

  for (const msg of merged) {
    if (Array.isArray(msg.content)) {
      msg.content = msg.content.filter((part: any) => part.type !== 'text' || part.text?.trim())

      if (msg.role === 'assistant') {
        msg.content = dedupeAssistantToolCalls(msg.content)
      }

      if (msg.role === 'user' || msg.role === 'system') {
        const textParts = msg.content.filter((part: any) => part.type === 'text')
        if (textParts.length > 1) {
          const mergedText = textParts.map((part: any) => part.text).join('\n\n')
          const otherParts = msg.content.filter((part: any) => part.type !== 'text')
          msg.content = [{ type: 'text', text: mergedText }, ...otherParts]
        }
        if (msg.content.length === 1 && msg.content[0].type === 'text') {
          msg.content = msg.content[0].text
        }
      }

      if (msg.content.length === 0) {
        if (msg.role === 'assistant') {
          msg.content = [{ type: 'text', text: ' ' }]
        } else {
          continue
        }
      }
    } else if (typeof msg.content === 'string' && !msg.content.trim()) {
      if (msg.role === 'assistant') {
        msg.content = ' '
      } else {
        continue
      }
    }

    prevalidated.push(msg)
  }

  const final: any[] = []
  let pendingToolCalls: Map<string, string> | null = null

  for (const msg of prevalidated) {
    if (msg.role === 'assistant') {
      final.push(msg)
      const toolCalls = extractAssistantToolCalls(msg)
      pendingToolCalls = toolCalls.size > 0 ? toolCalls : null
      continue
    }

    if (msg.role === 'tool') {
      const previous = final[final.length - 1]
      if (previous?.role !== 'assistant' || !pendingToolCalls) {
        continue
      }

      // The tool name must match the originating call: Gemini rejects a `functionResponse`
      // naming an undeclared tool with a bare 400 INVALID_ARGUMENT.
      const validContent = asParts(msg.content)
        .filter(
          (part: any) => part?.type === 'tool-result' && pendingToolCalls?.has(part.toolCallId)
        )
        .map((part: any) => {
          const resolvedToolName = pendingToolCalls?.get(part.toolCallId)
          if (!resolvedToolName || resolvedToolName === part.toolName) return part
          return { ...part, toolName: resolvedToolName }
        })

      if (validContent.length === 0) {
        continue
      }

      final.push({ ...msg, content: validContent })
      pendingToolCalls = null
      continue
    }

    final.push(msg)
    pendingToolCalls = null
  }

  return dropUnresolvedAssistantToolCalls(final)
}
