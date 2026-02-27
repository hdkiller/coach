import { getServerSession } from '../../utils/session'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'
import { prisma } from '../../utils/db'
import { calculateLlmCost } from '../../utils/ai-config'

const VALID_AUDIO_TYPES = new Set([
  'audio/webm',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/mp4',
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/aac',
  'audio/flac'
])

const MAX_AUDIO_SIZE_BYTES = 20 * 1024 * 1024

function normalizeAudioMediaType(mediaType?: string) {
  if (!mediaType) return 'audio/webm'
  return mediaType.split(';')[0]?.trim().toLowerCase() || 'audio/webm'
}

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = (session.user as any).id
  if (!userId) {
    throw createError({ statusCode: 401, message: 'User ID not found' })
  }

  const formData = await readMultipartFormData(event)
  if (!formData?.length) {
    throw createError({ statusCode: 400, message: 'No audio file uploaded' })
  }

  const audio = formData.find((part) => part.name === 'audio')
  if (!audio?.data?.length) {
    throw createError({ statusCode: 400, message: 'Audio file is required' })
  }

  const mediaType = normalizeAudioMediaType(audio.type)
  if (!VALID_AUDIO_TYPES.has(mediaType)) {
    throw createError({
      statusCode: 400,
      message: `Unsupported audio type: ${audio.type || mediaType}`
    })
  }

  if (audio.data.length > MAX_AUDIO_SIZE_BYTES) {
    throw createError({
      statusCode: 400,
      message: 'Audio file too large. Max 20MB.'
    })
  }

  const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY
  })
  const modelName = 'gemini-3-flash-preview'

  const startedAt = Date.now()

  try {
    const result = await generateText({
      model: google(modelName),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Transcribe this voice note for a chat composer. Return only the transcript text. Do not summarize, interpret, add formatting, or answer the user.'
            },
            {
              type: 'file',
              data: audio.data,
              mediaType,
              filename: audio.filename || 'dictation'
            }
          ]
        }
      ],
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingBudget: 0
          }
        }
      }
    })

    const transcript = result.text?.trim()
    if (!transcript) {
      throw createError({ statusCode: 502, message: 'No transcript returned from Gemini' })
    }

    try {
      const usage = result.usage
      const promptTokens = usage?.inputTokens || 0
      const completionTokens = usage?.outputTokens || 0
      const cachedTokens = usage?.inputTokenDetails?.cacheReadTokens || 0
      const reasoningTokens = (usage as any)?.outputTokenDetails?.reasoningTokens || 0

      await prisma.llmUsage.create({
        data: {
          userId,
          provider: 'gemini',
          model: modelName,
          modelType: 'flash',
          operation: 'chat_transcription',
          promptTokens,
          completionTokens,
          cachedTokens,
          reasoningTokens,
          totalTokens: promptTokens + completionTokens,
          estimatedCost: calculateLlmCost(
            modelName,
            promptTokens,
            completionTokens + reasoningTokens,
            cachedTokens
          ),
          durationMs: Date.now() - startedAt,
          retryCount: 0,
          success: true,
          promptPreview: '[voice note transcription]',
          responsePreview: transcript.substring(0, 500)
        }
      })
    } catch (error) {
      console.error('[Chat Transcribe] Failed to log LLM usage:', error)
    }

    return {
      transcript
    }
  } catch (error: any) {
    console.error('[Chat Transcribe] Failed to transcribe audio:', error)
    throw createError({
      statusCode: error?.statusCode || 500,
      message: error?.message || 'Failed to transcribe audio'
    })
  }
})
