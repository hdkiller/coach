import { workoutTools } from './ai-tools/workouts'
import { planningTools } from './ai-tools/planning'
import { recommendationTools } from './ai-tools/recommendations'
import { analysisTools } from './ai-tools/analysis'
import { profileTools } from './ai-tools/profile'

export const getToolsWithContext = (userId: string, timezone: string) => {
  return {
    ...workoutTools(userId, timezone),
    ...planningTools(userId, timezone),
    ...recommendationTools(userId, timezone),
    ...analysisTools(userId, timezone),
    ...profileTools(userId, timezone)
  }
}
