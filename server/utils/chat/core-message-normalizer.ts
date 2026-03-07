function asParts(content: any): any[] {
  if (Array.isArray(content)) return content
  if (typeof content === 'string') return [{ type: 'text', text: content }]
  return []
}

function extractAssistantToolCallIds(message: any): Set<string> {
  const ids = new Set<string>()

  for (const part of asParts(message.content)) {
    if (part?.type === 'tool-call' && part.toolCallId) {
      ids.add(part.toolCallId)
    }
  }

  return ids
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
  let pendingToolCallIds: Set<string> | null = null

  for (const msg of prevalidated) {
    if (msg.role === 'assistant') {
      final.push(msg)
      const toolCallIds = extractAssistantToolCallIds(msg)
      pendingToolCallIds = toolCallIds.size > 0 ? toolCallIds : null
      continue
    }

    if (msg.role === 'tool') {
      const previous = final[final.length - 1]
      if (previous?.role !== 'assistant' || !pendingToolCallIds) {
        continue
      }

      const validContent = asParts(msg.content).filter(
        (part: any) => part?.type === 'tool-result' && pendingToolCallIds?.has(part.toolCallId)
      )

      if (validContent.length === 0) {
        continue
      }

      final.push({ ...msg, content: validContent })
      pendingToolCallIds = null
      continue
    }

    final.push(msg)
    pendingToolCallIds = null
  }

  return final
}
