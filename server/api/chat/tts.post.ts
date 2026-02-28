import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'
import { calculateLlmCost } from '../../utils/ai-config'

const MODEL_NAME = 'gemini-2.5-flash-preview-tts'
const SAMPLE_RATE = 24000
const CHANNELS = 1
const BITS_PER_SAMPLE = 16
const BASE_TTS_INSTRUCTION = `You are the voice of Coach Watts.

Read the message aloud naturally for a fitness and nutrition coaching app.
Keep the wording and meaning intact. Do not summarize, explain, rewrite, or add extra words.

Delivery rules:
- Sound human, clear, grounded, and conversational.
- Ignore markdown syntax and formatting artifacts if any remain.
- Treat headings as light spoken emphasis, not as separate titles.
- Treat bullet points and short lists as spoken list items with slight pauses between them.
- Read numbers, quantities, units, and training metrics clearly.
- Keep calories, grams, kilometers, minutes, heart rate, and watts easy to understand.
- Slightly emphasize actionable recommendations and key takeaways.
- Keep cautionary or recovery-related statements calm, credible, and composed.
- Avoid exaggerated emotion, theatrical delivery, radio-announcer tone, or ad-like energy.
- If formatting artifacts remain, read only the intended words and skip the symbols.`
const GEMINI_VOICES = [
  'Zephyr',
  'Puck',
  'Charon',
  'Kore',
  'Fenrir',
  'Leda',
  'Orus',
  'Aoede',
  'Callirrhoe',
  'Autonoe',
  'Enceladus',
  'Iapetus',
  'Umbriel',
  'Algieba',
  'Despina',
  'Erinome',
  'Algenib',
  'Rasalgethi',
  'Laomedeia',
  'Achernar',
  'Alnilam',
  'Schedar',
  'Gacrux',
  'Pulcherrima',
  'Achird',
  'Zubenelgenubi',
  'Vindemiatrix',
  'Sadachbia',
  'Sadaltager',
  'Sulafat'
] as const

const VOICE_PRESETS = {
  coach: {
    label: 'Coach',
    voice: 'Kore',
    style:
      'Sound like an experienced coach: confident, grounded, supportive, and composed. Give practical advice with steady presence.'
  },
  calm: {
    label: 'Calm',
    voice: 'Achernar',
    style:
      'Sound warm, reassuring, patient, and steady. Reduce urgency and keep the delivery smooth and easy to absorb.'
  },
  direct: {
    label: 'Direct',
    voice: 'Alnilam',
    style:
      'Sound clear, concise, efficient, and matter-of-fact. Be respectful, but minimize softness and keep the delivery crisp.'
  },
  energetic: {
    label: 'Energetic',
    voice: 'Puck',
    style:
      'Sound upbeat, motivating, lively, and positive. Add energy without rushing or sounding overexcited.'
  }
} as const

type VoicePresetKey = keyof typeof VOICE_PRESETS
type GeminiVoiceName = (typeof GEMINI_VOICES)[number]
const SPEED_PRESETS = {
  slow: 'Use a measured pace with slightly longer pauses between phrases so the message is easy to absorb.',
  normal: 'Use a natural conversational pace with balanced pauses.',
  fast: 'Use a brisk but still clear pace, with tighter pauses and a more compact rhythm.'
} as const
type SpeedPresetKey = keyof typeof SPEED_PRESETS

function createWavBuffer(pcmData: Buffer, sampleRate: number) {
  const header = Buffer.alloc(44)
  const dataSize = pcmData.length
  const byteRate = sampleRate * CHANNELS * (BITS_PER_SAMPLE / 8)
  const blockAlign = CHANNELS * (BITS_PER_SAMPLE / 8)

  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataSize, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(CHANNELS, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(BITS_PER_SAMPLE, 34)
  header.write('data', 36)
  header.writeUInt32LE(dataSize, 40)

  return Buffer.concat([header, pcmData])
}

function getPreset(key?: string) {
  if (key && key in VOICE_PRESETS) {
    return VOICE_PRESETS[key as VoicePresetKey]
  }

  return VOICE_PRESETS.coach
}

function getSpeedInstruction(key?: string) {
  if (key && key in SPEED_PRESETS) {
    return SPEED_PRESETS[key as SpeedPresetKey]
  }

  return SPEED_PRESETS.normal
}

function getGeminiVoiceName(value: string | undefined, fallback: GeminiVoiceName) {
  if (value && GEMINI_VOICES.includes(value as GeminiVoiceName)) {
    return value as GeminiVoiceName
  }

  return fallback
}

function buildTtsPrompt(params: { text: string; style: string; speedInstruction: string }) {
  return `${BASE_TTS_INSTRUCTION}

Voice style:
${params.style}

Pacing:
${params.speedInstruction}

Message:
${params.text}`
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

  if (!process.env.GEMINI_API_KEY) {
    throw createError({ statusCode: 500, message: 'Missing GEMINI_API_KEY' })
  }

  const body = await readBody<{
    text?: string
    preset?: string
    speed?: string
    voiceName?: string
    preview?: boolean
    messageId?: string
  }>(event)

  const rawText = body?.text?.trim()
  if (!rawText) {
    throw createError({ statusCode: 400, message: 'Text is required' })
  }

  const text = rawText.slice(0, 8000)
  const preset = getPreset(body?.preset)
  const speedInstruction = getSpeedInstruction(body?.speed)
  const voiceName = getGeminiVoiceName(body?.voiceName, preset.voice)
  const prompt = buildTtsPrompt({
    text,
    style: preset.style,
    speedInstruction
  })
  const operation = body?.preview ? 'chat_tts_preview' : 'chat_tts'
  const startedAt = Date.now()

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName
                }
              }
            }
          }
        })
      }
    )

    const payload = await response.json()

    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        message: payload?.error?.message || payload?.error?.status || 'Gemini TTS request failed'
      })
    }

    const audioPart = payload?.candidates?.[0]?.content?.parts?.find(
      (part: any) => typeof part?.inlineData?.data === 'string'
    )
    const audioBase64 = audioPart?.inlineData?.data

    if (!audioBase64) {
      throw createError({ statusCode: 502, message: 'Gemini returned no audio data' })
    }

    const pcmBuffer = Buffer.from(audioBase64, 'base64')
    const wavBuffer = createWavBuffer(pcmBuffer, SAMPLE_RATE)

    try {
      const usage = payload?.usageMetadata
      const promptTokens = usage?.promptTokenCount || 0
      const completionTokens = usage?.candidatesTokenCount || 0
      const cachedTokens = usage?.cachedContentTokenCount || 0

      await prisma.llmUsage.create({
        data: {
          userId,
          provider: 'gemini',
          model: MODEL_NAME,
          modelType: 'flash',
          operation,
          entityType: body?.messageId ? 'chat_message' : undefined,
          entityId: body?.messageId || undefined,
          promptTokens,
          completionTokens,
          cachedTokens,
          reasoningTokens: 0,
          totalTokens: promptTokens + completionTokens,
          estimatedCost: calculateLlmCost(MODEL_NAME, promptTokens, completionTokens, cachedTokens),
          durationMs: Date.now() - startedAt,
          retryCount: 0,
          success: true,
          promptPreview: prompt.slice(0, 500),
          responsePreview: `[tts:${preset.label}:${body?.speed || 'normal'}:${voiceName}]`
        }
      })
    } catch (error) {
      console.error('[Chat TTS] Failed to log LLM usage:', error)
    }

    setHeader(event, 'Content-Type', 'audio/wav')
    setHeader(event, 'Cache-Control', 'no-store')
    setHeader(event, 'Content-Disposition', 'inline; filename="coach-watts-tts.wav"')

    return wavBuffer
  } catch (error: any) {
    console.error('[Chat TTS] Failed to synthesize audio:', error)
    throw createError({
      statusCode: error?.statusCode || error?.status || 500,
      message: error?.message || 'Failed to synthesize speech'
    })
  }
})
