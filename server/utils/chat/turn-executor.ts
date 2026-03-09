import { NoSuchToolError, stepCountIs, streamText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { calculateLlmCost } from '../ai-config'
import { getLlmOperationSettings } from '../ai-operation-settings'
import { getToolsWithContext } from '../ai-tools'
import { getUserAiSettings } from '../ai-user-settings'
import { prisma } from '../db'
import { getUserTimezone } from '../date'
import { buildPersistedToolCalls, expandStoredChatMessage } from './history'
import { CHAT_TURN_EVENT_TYPE, CHAT_TURN_STATUS } from './turns'
import { buildAthleteContext } from '../services/chatContextService'
import { chatTurnService } from '../services/chatTurnService'
import { checkQuota } from '../quotas/engine'
import { sendToUser } from '../ws-state'
import { transformHistoryToCoreMessages } from '../ai-history'
import { normalizeCoreMessagesForGemini } from './core-message-normalizer'
import { findToolNameRepair } from './tool-call-repair'

function normalizeMessagesForSdk(inputMessages: any[]) {
  const approvalResponses = new Map<string, { approved: boolean; reason?: string }>()

  for (const msg of inputMessages) {
    if (msg.role !== 'tool') continue
    const parts = Array.isArray(msg.parts)
      ? msg.parts
      : Array.isArray(msg.content)
        ? msg.content
        : []
    for (const part of parts) {
      if (part?.type !== 'tool-approval-response' || !part.approvalId) continue
      approvalResponses.set(part.approvalId, {
        approved: !!part.approved,
        reason: part.reason || part.result
      })
    }
  }

  return inputMessages
    .filter((msg) => msg.role !== 'tool')
    .map((msg) => {
      if (msg.role !== 'assistant' || !Array.isArray(msg.parts)) return msg

      const parts = msg.parts.map((part: any) => {
        if (!part?.type?.startsWith('tool-')) return part

        const approvalId = part.approvalId || part.approval?.id
        if (!approvalId) return part

        const response = approvalResponses.get(approvalId)
        if (!response) return part

        return {
          ...part,
          state: 'approval-responded',
          approval: {
            ...(part.approval || {}),
            id: approvalId,
            approved: response.approved,
            reason: response.reason
          }
        }
      })

      return {
        ...msg,
        parts
      }
    })
}

function stripAssistantToolOutputsWhenCanonicalToolMessagesExist(messages: any[]) {
  const canonicalToolCallIds = new Set<string>()

  for (const message of messages) {
    if (message?.role !== 'tool') continue
    const parts = Array.isArray(message.parts)
      ? message.parts
      : Array.isArray(message.content)
        ? message.content
        : []

    for (const part of parts) {
      const toolCallId = part?.toolCallId || part?.approvalId
      if (toolCallId) {
        canonicalToolCallIds.add(toolCallId)
      }
    }
  }

  if (canonicalToolCallIds.size === 0) {
    return messages
  }

  return messages.map((message) => {
    if (message?.role !== 'assistant' || !Array.isArray(message.parts)) {
      return message
    }

    return {
      ...message,
      parts: message.parts.filter((part: any) => {
        if (!part?.type?.startsWith('tool-')) return true
        if (part?.state !== 'output-available') return true
        return !canonicalToolCallIds.has(part.toolCallId)
      })
    }
  })
}

export async function executeChatTurn(turnId: string) {
  const turn = await prisma.chatTurn.findUnique({
    where: { id: turnId },
    include: {
      room: {
        select: {
          metadata: true,
          deletedAt: true,
          name: true,
          _count: { select: { messages: true } }
        }
      }
    }
  })

  if (!turn || turn.room.deletedAt) {
    return { success: false, error: 'Turn not found or room deleted.' }
  }

  const requestSnapshot = chatTurnService.getRequestSnapshot(turn)
  const submittedMessages = Array.isArray(requestSnapshot.messages) ? requestSnapshot.messages : []
  const lastMessage = submittedMessages[submittedMessages.length - 1]
  const messageParts = Array.isArray(lastMessage?.parts)
    ? lastMessage.parts
    : typeof lastMessage?.content === 'string'
      ? [{ type: 'text', text: lastMessage.content }]
      : Array.isArray(lastMessage?.content)
        ? lastMessage.content
        : []

  const attachedFiles = [
    ...messageParts
      .filter((part: any) => part?.type === 'file' && part?.url && part?.mediaType)
      .map((part: any) => ({
        url: part.url,
        mediaType: part.mediaType,
        filename: part.filename
      })),
    ...(Array.isArray(requestSnapshot.files) ? requestSnapshot.files : [])
  ].filter(
    (file: any, index: number, array: any[]) =>
      file?.url &&
      file?.mediaType &&
      index === array.findIndex((candidate) => candidate?.url === file.url)
  )

  const content =
    requestSnapshot.content ||
    (typeof lastMessage?.content === 'string'
      ? lastMessage.content
      : messageParts
          .filter((p: any) => p?.type === 'text' && typeof p.text === 'string')
          .map((p: any) => p.text)
          .join(''))

  await checkQuota(turn.userId, 'chat')
  await chatTurnService.updateStatus(turn.id, CHAT_TURN_STATUS.RUNNING, {
    startedAt: turn.startedAt || new Date(),
    finishedAt: null,
    failureReason: null
  })

  const earlyUsage = await chatTurnService.startLlmUsage(turn.id, turn.userId, content || '')

  const draft = await chatTurnService.createAssistantDraft({
    turnId: turn.id,
    roomId: turn.roomId,
    status: CHAT_TURN_STATUS.RUNNING,
    existingMessageId: turn.assistantMessageId
  })

  const { systemInstruction: baseSystemInstruction } = await buildAthleteContext(turn.userId)
  const timezone = await getUserTimezone(turn.userId)
  const aiSettings = await getUserAiSettings(turn.userId)
  const roomMetadata = (turn.room.metadata as any) || {}
  let finalSystemInstruction = baseSystemInstruction
  if (roomMetadata?.historySummary) {
    finalSystemInstruction = `## Previous Conversation Summary\n${roomMetadata.historySummary}\n\n${baseSystemInstruction}`
  }

  const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY
  })
  const opSettings = await getLlmOperationSettings(turn.userId, 'chat')
  const modelName = opSettings.modelId
  const tools = getToolsWithContext(turn.userId, timezone, aiSettings, turn.roomId, {
    turnId: turn.id,
    lineageId: turn.lineageId,
    roomId: turn.roomId,
    userId: turn.userId
  })
  const availableToolNames = Object.keys(tools)

  const historyMessages = stripAssistantToolOutputsWhenCanonicalToolMessagesExist(
    normalizeMessagesForSdk(submittedMessages)
  )
  const coreMessages = await transformHistoryToCoreMessages(historyMessages)
  const normalizedMessages = normalizeCoreMessagesForGemini(coreMessages)

  const historyToolCalls = new Map<string, any>()
  const currentTurnToolCalls = new Map<string, any>()
  const allToolResults: any[] = []

  let assistantText = ''
  let persistedText = draft.content || ' '
  let lastPersistAt = 0
  let latestUsage: any = null
  const startedAt = turn.startedAt || new Date()
  const persistToolResultMessages = async (toolResults: any[]) => {
    if (!toolResults.length) return

    const canonicalParts = toolResults.map((toolResult: any) => ({
      type: 'tool-result',
      toolCallId: toolResult.toolCallId,
      toolName: toolResult.toolName,
      result: toolResult.result
    }))

    await chatTurnService.upsertToolResultMessage({
      turnId: turn.id,
      roomId: turn.roomId,
      toolResponses: canonicalParts
    })
  }

  const broadcastAssistantMessage = async (
    message: { id: string; content: string; createdAt: Date; metadata?: any },
    status: string,
    extra: {
      failureReason?: string | null
      finishedAt?: Date | null
    } = {}
  ) => {
    await sendToUser(turn.userId, {
      type: 'chat_message_upsert',
      roomId: turn.roomId,
      message: expandStoredChatMessage({
        ...message,
        senderId: 'ai_agent',
        turn: {
          id: turn.id,
          status,
          failureReason: extra.failureReason ?? null,
          startedAt,
          finishedAt: extra.finishedAt ?? null
        }
      })
    })
  }

  const broadcastAssistantTextDelta = async (textDelta: string, status: string) => {
    await sendToUser(turn.userId, {
      type: 'chat_assistant_text_delta',
      roomId: turn.roomId,
      turnId: turn.id,
      messageId: draft.id,
      textDelta,
      status
    })
  }

  const persistDraft = async (
    status: string,
    force = false,
    extraMetadata: Record<string, any> = {}
  ) => {
    const now = Date.now()
    if (!force && assistantText === persistedText && now - lastPersistAt < 250) return

    const toolCallsUsed = buildPersistedToolCalls(
      Array.from(currentTurnToolCalls.values()),
      allToolResults
    )

    persistedText = assistantText || ' '
    lastPersistAt = now

    const updatedDraft = await chatTurnService.updateAssistantDraft({
      messageId: draft.id,
      content: persistedText,
      metadata: {
        isDraft: status !== CHAT_TURN_STATUS.COMPLETED,
        turnId: turn.id,
        turnStatus: status,
        toolCalls: toolCallsUsed,
        toolsUsed: toolCallsUsed.map((entry: any) => entry.name),
        toolCallCount: toolCallsUsed.length,
        ...extraMetadata
      } as any
    })

    await chatTurnService.heartbeat(turn.id, status as any)
    await broadcastAssistantMessage(updatedDraft, status, {
      failureReason:
        typeof extraMetadata.failureReason === 'string' ? extraMetadata.failureReason : null
    })
  }

  await broadcastAssistantMessage(draft, CHAT_TURN_STATUS.RUNNING)

  const providerOptions: any = {}
  if (opSettings.thinkingBudget > 0) {
    if (modelName.includes('gemini-3')) {
      providerOptions.google = {
        thinkingConfig: { thinkingLevel: opSettings.thinkingLevel }
      }
    } else {
      providerOptions.google = {
        thinkingConfig: { thinkingBudget: opSettings.thinkingBudget }
      }
    }
  }

  try {
    const result = await streamText({
      model: google(modelName),
      system: finalSystemInstruction,
      messages: normalizedMessages,
      tools,
      experimental_repairToolCall: async ({ toolCall, error }) => {
        if (!NoSuchToolError.isInstance(error)) {
          return null
        }

        const repair = findToolNameRepair(toolCall.toolName, availableToolNames)
        if (!repair) {
          return null
        }

        await chatTurnService.recordEvent(turn.id, CHAT_TURN_EVENT_TYPE.TOOL_CALL_REPAIRED, {
          toolCallId: toolCall.toolCallId,
          originalToolName: toolCall.toolName,
          repairedToolName: repair.repairedName,
          strategy: repair.strategy,
          distance: repair.distance ?? null
        } as any)

        return {
          ...toolCall,
          toolName: repair.repairedName
        }
      },
      stopWhen: stepCountIs(opSettings.maxSteps),
      providerOptions,
      experimental_context: {
        turnId: turn.id,
        lineageId: turn.lineageId,
        roomId: turn.roomId,
        userId: turn.userId
      },
      onChunk: async ({ chunk }) => {
        if (chunk.type === 'text-delta') {
          assistantText += chunk.textDelta
          await broadcastAssistantTextDelta(chunk.textDelta, CHAT_TURN_STATUS.STREAMING)
          await persistDraft(CHAT_TURN_STATUS.STREAMING)
          await chatTurnService.recordEvent(turn.id, CHAT_TURN_EVENT_TYPE.ASSISTANT_TEXT_DELTA, {
            textDelta: chunk.textDelta
          } as any)
        }
      },
      onStepFinish: async ({ toolCalls, toolResults, usage }) => {
        latestUsage = usage
        if (toolCalls) {
          toolCalls.forEach((tc) => {
            historyToolCalls.set(tc.toolCallId, tc)
            currentTurnToolCalls.set(tc.toolCallId, tc)
          })
        }
        if (toolResults) {
          const detailed = toolResults.map((tr: any) => {
            const call = historyToolCalls.get(tr.toolCallId)
            return {
              ...tr,
              args: (tr as any).args || (tr as any).input || call?.args || call?.input,
              toolName: tr.toolName || call?.toolName,
              result: (tr as any).result || (tr as any).output
            }
          })
          allToolResults.push(...detailed)
          await persistToolResultMessages(allToolResults)
        }

        await persistDraft(
          toolCalls?.length ? CHAT_TURN_STATUS.WAITING_FOR_TOOLS : CHAT_TURN_STATUS.STREAMING,
          true
        )
      },
      onFinish: async (event) => {
        const { text, toolResults: finalStepResults, usage, toolCalls: finalCalls } = event
        latestUsage = usage
        assistantText = text || assistantText
        const hasMeaningfulText =
          typeof assistantText === 'string' && assistantText.trim().length > 0
        const hasToolActivity =
          (finalStepResults?.length || 0) > 0 ||
          (finalCalls?.length || 0) > 0 ||
          allToolResults.length > 0
        const shouldFallbackForEmptyResponse = !hasMeaningfulText && !hasToolActivity

        if (shouldFallbackForEmptyResponse) {
          assistantText =
            'I hit a response issue while processing that. Please retry your last message.'
        }

        if (finalStepResults?.length) {
          const finalDetailedResults = finalStepResults.map((tr: any) => {
            const call =
              finalCalls?.find((tc: any) => tc.toolCallId === tr.toolCallId) ||
              historyToolCalls.get(tr.toolCallId)
            return {
              ...tr,
              args: tr.args || call?.args || call?.input,
              toolName: tr.toolName || call?.toolName,
              result: tr.result || tr.output
            }
          })
          allToolResults.push(...finalDetailedResults)
          await persistToolResultMessages(allToolResults)
        }

        await persistDraft(CHAT_TURN_STATUS.COMPLETED, true)

        const finishedAt = new Date()
        await chatTurnService.updateStatus(turn.id, CHAT_TURN_STATUS.COMPLETED, {
          finishedAt,
          assistantMessageId: draft.id
        })
        await broadcastAssistantMessage(
          {
            id: draft.id,
            content: assistantText || ' ',
            createdAt: draft.createdAt,
            metadata: {
              ...((draft.metadata as any) || {}),
              isDraft: false
            }
          },
          CHAT_TURN_STATUS.COMPLETED,
          { finishedAt }
        )

        await chatTurnService.recordEvent(turn.id, CHAT_TURN_EVENT_TYPE.TURN_COMPLETED, {
          assistantMessageId: draft.id
        } as any)

        await prisma.llmUsage
          .update({
            where: { id: earlyUsage.id },
            data: {
              model: modelName,
              success: !shouldFallbackForEmptyResponse,
              errorType: shouldFallbackForEmptyResponse ? 'EMPTY_RESPONSE' : null,
              errorMessage: shouldFallbackForEmptyResponse
                ? 'LLM response finished with empty text and no tool activity.'
                : null,
              responsePreview: assistantText.substring(0, 500)
            }
          })
          .catch(() => null)

        try {
          const promptTokens = usage.inputTokens || 0
          const completionTokens = usage.outputTokens || 0
          const cachedTokens = usage.inputTokenDetails?.cacheReadTokens || 0
          const reasoningTokens = (usage as any).outputTokenDetails?.reasoningTokens || 0
          const estimatedCost = calculateLlmCost(
            modelName,
            promptTokens,
            completionTokens + reasoningTokens,
            cachedTokens
          )

          await prisma.llmUsage.create({
            data: {
              userId: turn.userId,
              turnId: turn.id,
              provider: 'gemini',
              model: modelName,
              modelType: aiSettings.aiModelPreference === 'flash' ? 'flash' : 'pro',
              operation: 'chat',
              entityType: 'ChatMessage',
              entityId: draft.id,
              promptTokens,
              completionTokens,
              cachedTokens,
              reasoningTokens,
              totalTokens: promptTokens + completionTokens,
              estimatedCost,
              durationMs: 0,
              retryCount: 0,
              success: !shouldFallbackForEmptyResponse,
              errorType: shouldFallbackForEmptyResponse ? 'EMPTY_RESPONSE' : null,
              errorMessage: shouldFallbackForEmptyResponse
                ? 'LLM response finished with empty text and no tool activity.'
                : null,
              promptPreview: (content || '').substring(0, 500),
              responsePreview: assistantText.substring(0, 500)
            }
          })
        } catch (error) {
          console.error('[ChatTurn] LLM usage log failed:', error)
        }
      }
    })

    await result.consumeStream({
      onError: () => undefined
    })

    return {
      success: true,
      assistantMessageId: draft.id
    }
  } catch (error: any) {
    const reason =
      error?.name === 'AbortError' ? 'Turn aborted.' : error?.message || 'Chat turn failed.'
    const finishedAt = new Date()
    await persistDraft(CHAT_TURN_STATUS.INTERRUPTED, true, {
      interrupted: true,
      failureReason: reason
    }).catch(() => null)
    await chatTurnService.updateStatus(turn.id, CHAT_TURN_STATUS.INTERRUPTED, {
      finishedAt,
      failureReason: reason,
      assistantMessageId: draft.id
    })
    await broadcastAssistantMessage(
      {
        id: draft.id,
        content: assistantText || ' ',
        createdAt: draft.createdAt,
        metadata: {
          ...((draft.metadata as any) || {}),
          isDraft: true,
          interrupted: true,
          failureReason: reason
        }
      },
      CHAT_TURN_STATUS.INTERRUPTED,
      { failureReason: reason, finishedAt }
    ).catch(() => null)
    await prisma.llmUsage
      .update({
        where: { id: earlyUsage.id },
        data: {
          model: modelName,
          success: false,
          errorType: error?.name === 'AbortError' ? 'INTERRUPTED' : 'FAILED',
          errorMessage: reason
        }
      })
      .catch(() => null)
    throw error
  }
}
