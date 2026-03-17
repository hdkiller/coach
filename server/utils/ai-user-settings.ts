import { prisma } from './db'
import type { GeminiModel } from './ai-config'

export interface AiSettings {
  aiPersona: string
  aiModelPreference: GeminiModel
  aiAutoAnalyzeWorkouts: boolean
  aiAutoAnalyzeNutrition: boolean
  aiAutoAnalyzeReadiness: boolean
  aiRequireToolApproval: boolean
  aiProactivityEnabled: boolean
  aiConversationalEngagement: boolean
  aiMemoryEnabled: boolean
  aiContext?: string | null
  nutritionTrackingEnabled: boolean
  updateWorkoutNotesEnabled: boolean
  nickname?: string | null
  aiTtsStyle: 'coach' | 'calm' | 'direct' | 'energetic'
  aiTtsVoiceName: string
  aiTtsSpeed: 'slow' | 'normal' | 'fast'
  aiTtsAutoReadMessages: boolean
}

const DEFAULT_SETTINGS: AiSettings = {
  aiPersona: 'Supportive',
  aiModelPreference: 'flash',
  aiAutoAnalyzeWorkouts: false,
  aiAutoAnalyzeNutrition: false,
  aiAutoAnalyzeReadiness: false,
  aiRequireToolApproval: false,
  aiProactivityEnabled: false,
  aiConversationalEngagement: true,
  aiMemoryEnabled: true,
  aiContext: null,
  nutritionTrackingEnabled: true,
  updateWorkoutNotesEnabled: true,
  nickname: null,
  aiTtsStyle: 'coach',
  aiTtsVoiceName: 'Kore',
  aiTtsSpeed: 'normal',
  aiTtsAutoReadMessages: false
}

export async function getUserAiSettings(userId: string): Promise<AiSettings> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
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

  if (!user) {
    return DEFAULT_SETTINGS
  }

  return {
    aiPersona: user.aiPersona || DEFAULT_SETTINGS.aiPersona,
    aiModelPreference:
      (user.aiModelPreference as GeminiModel) || DEFAULT_SETTINGS.aiModelPreference,
    aiAutoAnalyzeWorkouts: user.aiAutoAnalyzeWorkouts ?? DEFAULT_SETTINGS.aiAutoAnalyzeWorkouts,
    aiAutoAnalyzeNutrition: user.aiAutoAnalyzeNutrition ?? DEFAULT_SETTINGS.aiAutoAnalyzeNutrition,
    aiAutoAnalyzeReadiness: user.aiAutoAnalyzeReadiness ?? DEFAULT_SETTINGS.aiAutoAnalyzeReadiness,
    aiRequireToolApproval: user.aiRequireToolApproval ?? DEFAULT_SETTINGS.aiRequireToolApproval,
    aiProactivityEnabled: user.aiProactivityEnabled ?? DEFAULT_SETTINGS.aiProactivityEnabled,
    aiConversationalEngagement:
      user.aiConversationalEngagement ?? DEFAULT_SETTINGS.aiConversationalEngagement,
    aiMemoryEnabled: user.aiMemoryEnabled ?? DEFAULT_SETTINGS.aiMemoryEnabled,
    aiContext: user.aiContext,
    nutritionTrackingEnabled:
      user.nutritionTrackingEnabled ?? DEFAULT_SETTINGS.nutritionTrackingEnabled,
    updateWorkoutNotesEnabled:
      user.updateWorkoutNotesEnabled ?? DEFAULT_SETTINGS.updateWorkoutNotesEnabled,
    nickname: user.nickname,
    aiTtsStyle: (user.aiTtsStyle as AiSettings['aiTtsStyle']) || DEFAULT_SETTINGS.aiTtsStyle,
    aiTtsVoiceName: user.aiTtsVoiceName || DEFAULT_SETTINGS.aiTtsVoiceName,
    aiTtsSpeed: (user.aiTtsSpeed as AiSettings['aiTtsSpeed']) || DEFAULT_SETTINGS.aiTtsSpeed,
    aiTtsAutoReadMessages: user.aiTtsAutoReadMessages ?? DEFAULT_SETTINGS.aiTtsAutoReadMessages
  }
}
