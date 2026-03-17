import { defineEventHandler, createError, readBody } from 'h3'
import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'

defineRouteMeta({
  openAPI: {
    tags: ['Settings'],
    summary: 'Update AI settings',
    description: 'Updates the AI preferences for the authenticated user.',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              aiPersona: {
                type: 'string',
                enum: ['Analytical', 'Supportive', 'Drill Sergeant', 'Motivational']
              },
              aiModelPreference: { type: 'string', enum: ['flash', 'pro', 'experimental'] },
              aiAutoAnalyzeWorkouts: { type: 'boolean' },
              aiAutoAnalyzeNutrition: { type: 'boolean' },
              aiAutoAnalyzeReadiness: { type: 'boolean' },
              aiRequireToolApproval: { type: 'boolean' },
              aiProactivityEnabled: { type: 'boolean' },
              aiConversationalEngagement: { type: 'boolean' },
              aiMemoryEnabled: { type: 'boolean' },
              aiDeepAnalysisEnabled: { type: 'boolean' },
              aiContext: { type: 'string', nullable: true },
              nutritionTrackingEnabled: { type: 'boolean' },
              updateWorkoutNotesEnabled: { type: 'boolean' },
              nickname: { type: 'string', nullable: true },
              aiTtsStyle: { type: 'string', enum: ['coach', 'calm', 'direct', 'energetic'] },
              aiTtsVoiceName: { type: 'string' },
              aiTtsSpeed: { type: 'string', enum: ['slow', 'normal', 'fast'] },
              aiTtsAutoReadMessages: { type: 'boolean' }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                settings: {
                  type: 'object',
                  properties: {
                    aiPersona: { type: 'string' },
                    aiModelPreference: { type: 'string' },
                    aiAutoAnalyzeWorkouts: { type: 'boolean' },
                    aiAutoAnalyzeNutrition: { type: 'boolean' },
                    aiRequireToolApproval: { type: 'boolean' },
                    aiMemoryEnabled: { type: 'boolean' },
                    aiContext: { type: 'string', nullable: true },
                    nutritionTrackingEnabled: { type: 'boolean' },
                    updateWorkoutNotesEnabled: { type: 'boolean' },
                    nickname: { type: 'string', nullable: true },
                    aiTtsStyle: { type: 'string' },
                    aiTtsVoiceName: { type: 'string' },
                    aiTtsSpeed: { type: 'string' },
                    aiTtsAutoReadMessages: { type: 'boolean' }
                  }
                }
              }
            }
          }
        }
      },
      400: { description: 'Invalid input' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.email) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const body = await readBody(event)
  const {
    aiPersona,
    aiModelPreference,
    aiAutoAnalyzeWorkouts,
    aiAutoAnalyzeNutrition,
    aiAutoAnalyzeReadiness,
    aiRequireToolApproval,
    aiProactivityEnabled,
    aiConversationalEngagement,
    aiMemoryEnabled,
    aiDeepAnalysisEnabled,
    aiContext,
    nutritionTrackingEnabled,
    updateWorkoutNotesEnabled,
    nickname,
    aiTtsStyle,
    aiTtsVoiceName,
    aiTtsSpeed,
    aiTtsAutoReadMessages
  } = body

  // Validate inputs
  const validPersonas = ['Analytical', 'Supportive', 'Drill Sergeant', 'Motivational']
  const validModels = ['flash', 'pro', 'experimental']
  const validTtsStyles = ['coach', 'calm', 'direct', 'energetic']
  const validTtsSpeeds = ['slow', 'normal', 'fast']
  const validTtsVoices = [
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
  ]

  if (aiPersona && !validPersonas.includes(aiPersona)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid AI persona'
    })
  }

  if (aiModelPreference && !validModels.includes(aiModelPreference)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid AI model preference'
    })
  }

  if (aiTtsStyle && !validTtsStyles.includes(aiTtsStyle)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid AI TTS style'
    })
  }

  if (aiTtsSpeed && !validTtsSpeeds.includes(aiTtsSpeed)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid AI TTS speed'
    })
  }

  if (aiTtsVoiceName && !validTtsVoices.includes(aiTtsVoiceName)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid AI TTS voice'
    })
  }

  const user = await prisma.user.update({
    where: { email: session.user.email },
    data: {
      ...(aiPersona !== undefined && { aiPersona }),
      ...(aiModelPreference !== undefined && { aiModelPreference }),
      ...(aiAutoAnalyzeWorkouts !== undefined && { aiAutoAnalyzeWorkouts }),
      ...(aiAutoAnalyzeNutrition !== undefined && { aiAutoAnalyzeNutrition }),
      ...(aiAutoAnalyzeReadiness !== undefined && { aiAutoAnalyzeReadiness }),
      ...(aiRequireToolApproval !== undefined && { aiRequireToolApproval }),
      ...(aiProactivityEnabled !== undefined && { aiProactivityEnabled }),
      ...(aiConversationalEngagement !== undefined && { aiConversationalEngagement }),
      ...(aiMemoryEnabled !== undefined && { aiMemoryEnabled }),
      ...(aiDeepAnalysisEnabled !== undefined && { aiDeepAnalysisEnabled }),
      ...(aiContext !== undefined && { aiContext }),
      ...(nutritionTrackingEnabled !== undefined && { nutritionTrackingEnabled }),
      ...(updateWorkoutNotesEnabled !== undefined && { updateWorkoutNotesEnabled }),
      ...(nickname !== undefined && { nickname }),
      ...(aiTtsStyle !== undefined && { aiTtsStyle }),
      ...(aiTtsVoiceName !== undefined && { aiTtsVoiceName }),
      ...(aiTtsSpeed !== undefined && { aiTtsSpeed }),
      ...(aiTtsAutoReadMessages !== undefined && { aiTtsAutoReadMessages })
    },
    select: {
      aiPersona: true,
      aiModelPreference: true,
      aiAutoAnalyzeWorkouts: true,
      aiAutoAnalyzeNutrition: true,
      aiAutoAnalyzeReadiness: true,
      aiRequireToolApproval: true,
      aiProactivityEnabled: true,
      aiConversationalEngagement: true,
      aiMemoryEnabled: true,
      aiDeepAnalysisEnabled: true,
      aiContext: true,
      nutritionTrackingEnabled: true,
      updateWorkoutNotesEnabled: true,
      nickname: true,
      aiTtsStyle: true,
      aiTtsVoiceName: true,
      aiTtsSpeed: true,
      aiTtsAutoReadMessages: true
    }
  })

  return {
    success: true,
    settings: user
  }
})
