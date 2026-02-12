import { getEffectiveUserId } from '../../utils/coaching'
import { metabolicService } from '../../utils/services/metabolicService'

export default defineEventHandler(async (event) => {
  const userId = await getEffectiveUserId(event)
  const now = new Date()

  try {
    const allWindows = await metabolicService.getUpcomingFuelingWindows(userId, 7)

    // Filter for future windows (ending after now)
    const futureWindows = allWindows.filter((w) => new Date(w.endTime) > now)

    return {
      success: true,
      windows: futureWindows
    }
  } catch (error: any) {
    console.error('Error fetching upcoming fueling plan:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch upcoming fueling plan'
    })
  }
})
