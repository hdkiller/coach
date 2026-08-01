import { convertToModelMessages } from 'ai'

function toJsonSafe(value: any, seen: WeakSet<object> = new WeakSet()): any {
  if (value === null) return null

  const t = typeof value
  if (t === 'string' || t === 'number' || t === 'boolean') return value
  if (t === 'bigint') return value.toString()
  if (t === 'undefined') return null
  if (t === 'function' || t === 'symbol') return null

  if (value instanceof Date) return value.toISOString()
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack
    }
  }

  if (Array.isArray(value)) {
    return value.map((v) => toJsonSafe(v, seen))
  }

  if (t === 'object') {
    if (seen.has(value)) return '[Circular]'
    seen.add(value)

    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = toJsonSafe(v, seen)
    }
    return out
  }

  // Fallback for weird host objects
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return String(value)
  }
}

function getUiToolName(part: any) {
  if (part?.toolName || part?.name) {
    return part.toolName || part.name
  }

  if (typeof part?.type === 'string' && part.type.startsWith('tool-')) {
    return part.type.slice('tool-'.length)
  }

  return undefined
}

function buildCoreToolCallPart(
  rawPart: any,
  fallback: {
    toolCallId: string
    toolName: string
    input: any
  }
) {
  if (!rawPart || typeof rawPart !== 'object') {
    return {
      type: 'tool-call',
      toolCallId: fallback.toolCallId,
      toolName: fallback.toolName,
      input: fallback.input
    }
  }

  const thoughtSignature =
    rawPart.providerOptions?.google?.thoughtSignature ??
    rawPart.providerMetadata?.google?.thoughtSignature ??
    rawPart.thoughtSignature

  return {
    ...rawPart,
    type: 'tool-call',
    toolCallId: rawPart.toolCallId || fallback.toolCallId,
    toolName: rawPart.toolName || rawPart.name || fallback.toolName,
    input: rawPart.input ?? rawPart.args ?? fallback.input,
    ...(thoughtSignature
      ? {
          providerOptions: {
            ...(rawPart.providerOptions || {}),
            google: {
              ...(rawPart.providerOptions?.google || {}),
              thoughtSignature
            }
          }
        }
      : {})
  }
}

function normalizeToolResultPart(part: any) {
  const rawOutput =
    part?.result !== undefined
      ? part.result
      : part?.output?.value !== undefined
        ? part.output.value
        : part?.output !== undefined
          ? part.output
          : undefined

  const output =
    rawOutput && typeof rawOutput === 'object' && typeof rawOutput.type === 'string'
      ? rawOutput
      : typeof rawOutput === 'string'
        ? { type: 'text', value: rawOutput }
        : { type: 'json', value: rawOutput ?? null }

  return {
    type: 'tool-result',
    toolCallId: part?.toolCallId,
    toolName: part?.toolName || part?.name || 'unknown',
    output
  }
}

function mergeToolResultParts(parts: any[]) {
  const byToolCallId = new Map<string, any>()
  const withoutIds: any[] = []

  for (const rawPart of parts) {
    if (!rawPart) continue
    const part = normalizeToolResultPart(rawPart)

    if (!part.toolCallId) {
      withoutIds.push(part)
      continue
    }

    const existing = byToolCallId.get(part.toolCallId)
    if (!existing) {
      byToolCallId.set(part.toolCallId, part)
      continue
    }

    byToolCallId.set(part.toolCallId, {
      ...existing,
      toolName: existing.toolName || part.toolName,
      output: existing.output !== undefined ? existing.output : part.output
    })
  }

  return [...byToolCallId.values(), ...withoutIds]
}

/**
 * Transforms UI history messages (from Vercel AI SDK frontend) into CoreMessages
 * compatible with Google Generative AI (Gemini).
 *
 * Key Responsibilities:
 * 1. Maps 'assistant' role to 'model'.
 * 2. Merges interleaved tool calls and results.
 * 3. Patches missing 'tool-call' parts in history when only 'tool-approval-request' exists.
 * 4. Ensures no empty content for 'model' messages.
 * 5. Manually extracts tool results if SDK strips them.
 * 6. Sanitizes dangling tool calls.
 */
export async function transformHistoryToCoreMessages(historyMessages: any[]) {
  const coreMessages: any[] = []

  // Map approval IDs to tool call IDs to ensure consistency
  const approvalIdMap = new Map<string, string>()
  for (const m of historyMessages) {
    if (m.role === 'assistant' && Array.isArray(m.parts)) {
      m.parts.forEach((p: any) => {
        if (p.type === 'tool-approval-request' && p.approvalId && p.toolCallId) {
          approvalIdMap.set(p.approvalId, p.toolCallId)
        }
      })
    }
    // Also check metadata fallback
    if (m.role === 'assistant' && m.metadata?.toolApprovals) {
      const approvals = m.metadata.toolApprovals
      if (Array.isArray(approvals)) {
        approvals.forEach((approval: any) => {
          if (approval.approvalId && approval.toolCallId) {
            approvalIdMap.set(approval.approvalId, approval.toolCallId)
          }
        })
      }
    }
  }

  for (const msg of historyMessages) {
    if (msg.role === 'tool') {
      // Handle tool results. Tool outputs loaded from the database can carry raw
      // Date fields (e.g. plannedWorkout sync timestamps) that the AI SDK's
      // JSON-only prompt schema rejects, so make the payload JSON-safe first.
      const safeToolMsg = toJsonSafe(msg)
      const parts = Array.isArray(safeToolMsg.content)
        ? safeToolMsg.content
        : safeToolMsg.parts || []
      const results = parts
        .filter(
          (p: any) =>
            p.type === 'tool-result' ||
            p.type === 'tool-invocation' ||
            p.type === 'tool-approval-response'
        )
        .map((p: any) => {
          const resolvedId = p.toolCallId || approvalIdMap.get(p.approvalId) || p.approvalId
          return {
            type: 'tool-result',
            toolCallId: resolvedId,
            toolName: p.toolName || p.name || 'unknown',
            output:
              p.result !== undefined
                ? typeof p.result === 'string'
                  ? { type: 'text', value: p.result }
                  : { type: 'json', value: p.result ?? null }
                : {
                    type: 'text',
                    value: p.approved ? 'User confirmed action.' : 'User denied action.'
                  }
          }
        })

      if (results.length > 0) {
        coreMessages.push({
          role: 'tool',
          content: mergeToolResultParts(results)
        })
      }
      continue
    }

    // The Vercel AI SDK validates message schemas via Zod and rejects non-JSON
    // values like Date objects. History messages can contain Date fields
    // (createdAt/updatedAt) and tool outputs may include Dates too.
    const safeMsg = toJsonSafe(msg)

    // Use SDK helper
    const converted = await convertToModelMessages([safeMsg])

    // Pre-calculate extracted results for this message (if any)
    const toolResultParts = (safeMsg.parts || []).filter(
      (p: any) => p.type === 'tool-invocation' && p.state === 'result'
    )

    for (const coreMsg of converted) {
      // 1. Fix role mapping (assistant -> model)
      // Note: We keep it as 'assistant' for Vercel AI SDK compatibility,
      // the provider handles the mapping to 'model' internally.

      // 2. Repair & Patch: Fix broken tool calls and inject missing ones
      if (coreMsg.role === 'assistant') {
        // Ensure content is an array
        if (typeof (coreMsg as any).content === 'string') {
          ;(coreMsg as any).content = [{ type: 'text', text: (coreMsg as any).content }]
        } else if (!Array.isArray((coreMsg as any).content)) {
          ;(coreMsg as any).content = []
        }

        const uiParts = (safeMsg.parts || []) as any[]

        // A. Rehydrate raw tool-call metadata from persisted UI parts when available.
        const coreContent = (coreMsg as any).content as any[]
        coreContent.forEach((part) => {
          if (part.type !== 'tool-call') return

          const originalPart = uiParts.find(
            (p) => p.toolCallId === part.toolCallId || p.approvalId === part.toolCallId
          )
          if (originalPart) {
            const rawToolCallPart = buildCoreToolCallPart(originalPart.toolCall, {
              toolCallId: part.toolCallId,
              toolName: originalPart.toolCall?.toolName || getUiToolName(originalPart),
              input:
                originalPart.toolCall?.input ??
                originalPart.toolCall?.args ??
                originalPart.args ??
                originalPart.input ??
                {}
            })

            Object.assign(part, rawToolCallPart)
          }
        })

        // B. Patch: Inject tool calls that are completely missing
        const toolParts = uiParts.filter(
          (p: any) => p.type === 'tool-approval-request' || p.type === 'tool-invocation'
        )

        if (toolParts.length > 0) {
          // Look ahead in history to see if this tool call was actually executed/responded to
          const currentMsgIndex = historyMessages.indexOf(msg)
          const subsequentMessages = historyMessages
            .slice(currentMsgIndex + 1)
            .map((m) => (m && typeof m === 'object' ? toJsonSafe(m) : m))

          const validToolParts = toolParts.filter((tp: any) => {
            const id = tp.toolCallId || tp.approvalId
            if (!id) return false

            // Check if there is a result for this ID in subsequent messages
            const hasSubsequentResult = subsequentMessages.some(
              (m: any) =>
                m.role === 'tool' &&
                (Array.isArray(m.content) ? m.content : m.parts || []).some(
                  (p: any) => p.toolCallId === id || p.approvalId === id
                )
            )

            // Check if it's an invocation with a result already attached (state='result')
            const isResolvedInvocation = tp.type === 'tool-invocation' && tp.state === 'result'

            return hasSubsequentResult || isResolvedInvocation
          })

          if (validToolParts.length > 0) {
            // Tracked as a live set: patching two UI parts that share a tool call id must
            // not append two `tool-call` parts, because Gemini rejects duplicate
            // `functionCall` ids inside a single model turn with a 400 INVALID_ARGUMENT.
            const existingCallIds = new Set(
              coreContent.filter((p) => p.type === 'tool-call').map((p) => p.toolCallId)
            )

            validToolParts.forEach((tp: any) => {
              const toolCallId = tp.toolCallId || tp.approvalId
              const toolName = tp.toolCall?.toolName || getUiToolName(tp)

              // Only add if not already present (checked by ID)
              if (toolCallId && toolName && !existingCallIds.has(toolCallId)) {
                existingCallIds.add(toolCallId)
                coreContent.push(
                  buildCoreToolCallPart(tp.toolCall, {
                    toolCallId,
                    toolName,
                    input: tp.toolCall?.input ?? tp.toolCall?.args ?? tp.args ?? tp.input ?? {}
                  })
                )
              }
            })
          }
        }

        // C. Sanitize: Remove tool calls that have NO result (Dangling calls)
        const currentMsgIndex = historyMessages.indexOf(msg)
        const subsequentMessages = historyMessages
          .slice(currentMsgIndex + 1)
          .map((m) => (m && typeof m === 'object' ? toJsonSafe(m) : m))

        // Collect approval-responded tool call IDs — these represent pending execution
        // (the tool call was approved but not yet executed, so streamText must run it this turn).
        // They intentionally have no subsequent result and must NOT be sanitized away.
        const approvalRespondedIds = new Set<string>(
          uiParts
            .filter((p: any) => p.state === 'approval-responded')
            .map((p: any) => p.toolCallId)
            .filter(Boolean)
        )

        ;(coreMsg as any).content = ((coreMsg as any).content as any[]).filter((part) => {
          if (part.type !== 'tool-call') return true

          const id = part.toolCallId

          // Preserve approval-responded tool calls — streamText needs to execute them
          if (approvalRespondedIds.has(id)) return true

          // 1. Check for result in subsequent source history messages
          const hasSubsequentResult = subsequentMessages.some(
            (m: any) =>
              m.role === 'tool' &&
              (Array.isArray(m.content) ? m.content : m.parts || []).some(
                (p: any) => p.toolCallId === id || p.approvalId === id
              )
          )
          // 2. Check for result in SAME core message (interleaved)
          const hasSameMessageResult = ((coreMsg as any).content as any[]).some(
            (p) => p.type === 'tool-result' && p.toolCallId === id
          )

          // 3. Check for result in sibling converted messages
          const hasSiblingResult = converted.some(
            (m: any) =>
              m.role === 'tool' &&
              (m.content as any[]).some((p) => p.type === 'tool-result' && p.toolCallId === id)
          )

          // 4. Check for manually extracted results (from tool-invocation parts)
          // These will be appended after this message, so they are valid.
          const hasExtractedResult = toolResultParts.some((p: any) => p.toolCallId === id)

          return (
            hasSubsequentResult || hasSameMessageResult || hasSiblingResult || hasExtractedResult
          )
        })

        // Remove UI-only tool approval artifacts that convertToModelMessages can leak into
        // assistant content for continuation turns. The model prompt must only keep the
        // canonical tool-call part; otherwise the SDK sees an invalid mixed tool state.
        ;(coreMsg as any).content = ((coreMsg as any).content as any[]).filter(
          (part) => part.type !== 'tool-approval-request'
        )
      }

      // 3. Ensure no empty assistant messages
      if (
        coreMsg.role === 'assistant' &&
        (!(coreMsg as any).content ||
          (Array.isArray((coreMsg as any).content) && (coreMsg as any).content.length === 0))
      ) {
        ;(coreMsg as any).content = [{ type: 'text', text: ' ' }]
      }

      coreMessages.push(coreMsg)

      // Append extracted tool results if needed (and if not already produced by SDK)
      if (toolResultParts.length > 0) {
        const sdkProducedToolMsg = converted.find((m) => m.role === 'tool')

        if (!sdkProducedToolMsg) {
          coreMessages.push({
            role: 'tool',
            content: mergeToolResultParts(
              toolResultParts.map((p: any) => ({
                type: 'tool-result',
                toolCallId: p.toolCallId,
                toolName: p.toolName,
                output:
                  typeof p.result === 'string'
                    ? { type: 'text', value: p.result }
                    : { type: 'json', value: p.result ?? null }
              }))
            )
          })
        }
      }
    }
  }

  // Final Pass: Remove orphan tool results (Tool messages with no preceding call)
  // Gemini requires that every 'tool' message is preceded by a 'model' message containing the call.
  // We iterate backwards to safely remove.
  const validCoreMessages: any[] = []
  const toolNamesByCallId = new Map<string, string>()

  // First pass: Collect all valid tool call IDs from assistant messages
  coreMessages.forEach((msg) => {
    if (msg.role === 'assistant' && Array.isArray(msg.content)) {
      msg.content.forEach((p: any) => {
        if (p.type === 'tool-call') {
          toolNamesByCallId.set(p.toolCallId, p.toolName)
        }
      })
    }
  })

  // Second pass: Filter messages
  for (const msg of coreMessages) {
    if (msg.role === 'tool') {
      const content = mergeToolResultParts(msg.content as any[])
      // Filter out parts that don't have a matching call, and realign the tool name with
      // the originating call. Gemini rejects a `functionResponse` whose name does not match
      // a declared tool with a bare 400 INVALID_ARGUMENT, so the `'unknown'` fallback used
      // for approval responses (which carry no tool name) must never reach the provider.
      const validContent = content
        .filter((p: any) => toolNamesByCallId.has(p.toolCallId))
        .map((p: any) => ({ ...p, toolName: toolNamesByCallId.get(p.toolCallId) || p.toolName }))

      if (validContent.length > 0) {
        const previous = validCoreMessages[validCoreMessages.length - 1]
        if (previous?.role === 'tool') {
          previous.content = mergeToolResultParts([...(previous.content || []), ...validContent])
        } else {
          validCoreMessages.push({ ...msg, content: validContent })
        }
      } else {
        // Drop the message entirely if it has no valid results
        // Alternatively, convert to text? For now, dropping is safer for schema.
      }
    } else {
      validCoreMessages.push(msg)
    }
  }

  return validCoreMessages
}
