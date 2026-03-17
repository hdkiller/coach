import { workoutTools } from './ai-tools/workouts'
import { planningTools } from './ai-tools/planning'
import { libraryTools } from './ai-tools/library'
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
import { memoryTools } from './ai-tools/memory'
import { timeTools } from './ai-tools/time'
import { temporalTools } from './ai-tools/temporal'
import type { AiSettings } from './ai-user-settings'
import type { ChatToolExecutionContext } from './chat/turns'
import { wrapChatToolsForExecution } from './chat/tool-execution'

export const TEMPORARILY_DISABLED_CHAT_TOOLS = new Set([
  'report_bug',
  'find_bug_reports',
  'ticket_search',
  'ticket_comment',
  'update_workout_notes',
  'update_workout_tags',
  'analyze_activity',
  'sync_data',
  'generate_report'
])

export function isChatToolTemporarilyDisabled(toolName: string) {
  return TEMPORARILY_DISABLED_CHAT_TOOLS.has(toolName)
}

export function filterChatToolsForChat<T extends Record<string, any>>(tools: T) {
  return Object.fromEntries(
    Object.entries(tools).filter(([name]) => !isChatToolTemporarilyDisabled(name))
  ) as Partial<T>
}

export const getToolsWithContext = (
  userId: string,
  timezone: string,
  settings: AiSettings,
  chatRoomId?: string,
  executionContext?: Partial<ChatToolExecutionContext>
) => {
  const conditionalNutritionTools = settings.nutritionTrackingEnabled
    ? nutritionTools(userId, timezone, settings)
    : {}

  const tools = {
    ...workoutTools(userId, timezone, settings),
    ...planningTools(userId, timezone, settings),
    ...libraryTools(userId),
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
    ...memoryTools(userId, chatRoomId),
    ...timeTools(userId, timezone),
    ...temporalTools(userId, timezone)
  }

  const filteredTools = filterChatToolsForChat(tools)

  return executionContext
    ? wrapChatToolsForExecution(filteredTools, executionContext)
    : filteredTools
}
