import { task } from '@trigger.dev/sdk/v3'
import { mealRecommendationService } from '../server/utils/services/mealRecommendationService'
import { userReportsQueue } from './queues'

export const recommendNutritionMealTask = task({
  id: 'recommend-nutrition-meal',
  queue: userReportsQueue,
  run: async (payload: {
    userId: string
    date: string
    windowType?: string
    forceLlm?: boolean
    targetCarbs?: number
    targetProtein?: number
    targetKcal?: number
  }) => {
    const { userId, date, windowType, forceLlm, targetCarbs, targetProtein, targetKcal } = payload
    const targetDate = new Date(date)

    const result = await mealRecommendationService.getRecommendations(userId, targetDate, {
      scope: 'MEAL',
      windowType,
      forceLlm,
      targetCarbs,
      targetProtein,
      targetKcal
    })

    return result
  }
})
