import { generateObject } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { UserMemoryCategory, UserMemoryScope } from '@prisma/client'
import { z } from 'zod'
import { calculateLlmCost } from '../ai-config'
import { prisma } from '../db'
import { buildMemoryCandidate, type MemoryCandidate } from '../services/userMemoryService'

const MEMORY_EXTRACTION_MODEL_ID = 'gemini-flash-lite-latest'

const memoryCandidateSchema = z.object({
  content: z.string().min(1).max(400),
  scope: z.enum(['GLOBAL', 'ROOM']).default('GLOBAL'),
  category: z.enum(['PREFERENCE', 'GOAL', 'CONSTRAINT', 'PROFILE', 'COMMUNICATION', 'TEMPORARY']),
  confidence: z.number().min(0).max(1).default(0.5),
  sensitive: z.boolean().default(false),
  rationale: z.string().max(200).optional()
})

const memoryExtractionSchema = z.object({
  shouldExtract: z.boolean().default(false),
  candidates: z.array(memoryCandidateSchema).max(6).default([])
})

function formatExistingMemoryList(memories: Array<{ scope: string; content: string }>) {
  if (!memories.length) return '(none)'
  return memories.map((memory) => `- [${memory.scope}] ${memory.content}`).join('\n')
}

function formatConversation(messages: Array<{ role: string; content: string }>) {
  return messages
    .map((message) => `${message.role === 'assistant' ? 'Assistant' : 'User'}: ${message.content}`)
    .join('\n\n')
}

export async function extractMemoryCandidatesFromConversation(input: {
  userId: string
  roomId?: string | null
  turnId?: string | null
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  existingMemories?: Array<{ scope: 'GLOBAL' | 'ROOM'; content: string }>
  modelId?: string
  operation?: string
  entityType?: string
  entityId?: string | null
}) {
  const normalizedMessages = input.messages
    .map((message) => ({
      role: message.role,
      content: message.content.trim()
    }))
    .filter((message) => message.content.length > 0)

  if (!normalizedMessages.length) {
    return {
      shouldExtract: false,
      candidates: [] as MemoryCandidate[]
    }
  }

  const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY
  })

  const prompt = `You extract durable conversation memory from multilingual athlete coaching chats.

Return candidate memories only when the user has revealed stable, user-specific information worth remembering.

Good memory examples:
- long-term goals
- stable preferences
- communication preferences
- durable constraints or injuries
- profile facts the assistant should retain

Do not save:
- transient feelings
- one-off requests for this message only
- assistant speculation
- facts already present in the existing memory list unless the new turn clearly updates them
- verbose paraphrases; write concise canonical memory statements

Choose scope carefully:
- GLOBAL: applies across chats
- ROOM: only relevant to this chat thread

Existing memories:
${formatExistingMemoryList(input.existingMemories || [])}

Conversation:
${formatConversation(normalizedMessages)}`

  const startedAt = Date.now()

  try {
    const { object, usage } = await generateObject({
      model: google(input.modelId || MEMORY_EXTRACTION_MODEL_ID),
      schema: memoryExtractionSchema,
      prompt,
      maxRetries: 1
    })

    const candidates = (object.candidates || [])
      .filter((candidate) => candidate.confidence >= 0.75)
      .map((candidate) =>
        buildMemoryCandidate({
          content: candidate.content,
          scope: candidate.scope as UserMemoryScope,
          roomId: candidate.scope === 'ROOM' ? input.roomId || null : null,
          category: candidate.category as UserMemoryCategory,
          confidence: candidate.confidence,
          sensitive: candidate.sensitive,
          source: 'AUTO',
          metadata: {
            extraction: 'llm',
            rationale: candidate.rationale || null
          }
        })
      )
      .filter(
        (candidate, index, array) =>
          index === array.findIndex((entry) => entry.normalizedKey === candidate.normalizedKey)
      )

    await prisma.llmUsage
      .create({
        data: {
          userId: input.userId,
          turnId: input.turnId || null,
          provider: 'gemini',
          model: input.modelId || MEMORY_EXTRACTION_MODEL_ID,
          modelType: 'flash',
          operation: input.operation || 'memory-extract',
          entityType: input.entityType || 'ChatMessage',
          entityId: input.entityId || input.roomId || null,
          promptTokens: usage.inputTokens || 0,
          completionTokens: usage.outputTokens || 0,
          cachedTokens: usage.inputTokenDetails?.cacheReadTokens || 0,
          reasoningTokens: (usage as any).outputTokenDetails?.reasoningTokens || 0,
          totalTokens: (usage.inputTokens || 0) + (usage.outputTokens || 0),
          estimatedCost: calculateLlmCost(
            input.modelId || MEMORY_EXTRACTION_MODEL_ID,
            usage.inputTokens || 0,
            (usage.outputTokens || 0) + ((usage as any).outputTokenDetails?.reasoningTokens || 0),
            usage.inputTokenDetails?.cacheReadTokens || 0
          ),
          durationMs: Date.now() - startedAt,
          retryCount: 0,
          success: true,
          promptPreview: prompt.slice(0, 1000),
          responsePreview: JSON.stringify({
            shouldExtract: object.shouldExtract,
            candidates: candidates.map((candidate) => ({
              content: candidate.content,
              scope: candidate.scope,
              category: candidate.category
            }))
          }).slice(0, 1000),
          promptFull: prompt,
          responseFull: JSON.stringify(object)
        }
      })
      .catch(() => null)

    return {
      shouldExtract: !!object.shouldExtract && candidates.length > 0,
      candidates
    }
  } catch (error: any) {
    await prisma.llmUsage
      .create({
        data: {
          userId: input.userId,
          turnId: input.turnId || null,
          provider: 'gemini',
          model: input.modelId || MEMORY_EXTRACTION_MODEL_ID,
          modelType: 'flash',
          operation: input.operation || 'memory-extract',
          entityType: input.entityType || 'ChatMessage',
          entityId: input.entityId || input.roomId || null,
          durationMs: Date.now() - startedAt,
          retryCount: 0,
          success: false,
          errorType: 'MEMORY_EXTRACTION_FAILED',
          errorMessage: error?.message || 'Memory extraction failed.',
          promptPreview: prompt.slice(0, 1000),
          promptFull: prompt
        }
      })
      .catch(() => null)

    return {
      shouldExtract: false,
      candidates: [] as MemoryCandidate[]
    }
  }
}
