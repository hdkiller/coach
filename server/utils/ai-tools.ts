import { workoutTools } from './ai-tools/workouts'
import { planningTools } from './ai-tools/planning'
import { recommendationTools } from './ai-tools/recommendations'
import { analysisTools } from './ai-tools/analysis'
import { profileTools } from './ai-tools/profile'
import { supportTools } from './ai-tools/support'
import { mathTools } from './ai-tools/math'
import { metricTools } from './ai-tools/metric-tools'
import { nutritionTools } from './ai-tools/nutrition'
import { wellnessTools } from './ai-tools/wellness'
import { journeyTools } from './ai-tools/journey'
import { availabilityTools } from './ai-tools/availability'
import { timeTools } from './ai-tools/time'
import type { AiSettings } from './ai-user-settings'
import { getUserAiSettings } from './ai-user-settings'

export const getToolsWithContext = (
  userId: string,
  timezone: string,
  settings: AiSettings,
  chatRoomId?: string
) => {
  const conditionalNutritionTools = settings.nutritionTrackingEnabled
    ? nutritionTools(userId, timezone, settings)
    : {}

  return {
    ...workoutTools(userId, timezone, settings),
    ...planningTools(userId, timezone, settings),
    ...recommendationTools(userId, timezone),
    ...analysisTools(userId, timezone, settings),
    ...profileTools(userId, timezone, settings),
    ...supportTools(userId, chatRoomId, settings),
    ...mathTools(),
    ...metricTools(userId, timezone),
    ...conditionalNutritionTools,
    ...wellnessTools(userId, timezone),
    ...journeyTools(userId, timezone),
    ...availabilityTools(userId, settings),
    ...timeTools(userId, timezone)
  }
}
