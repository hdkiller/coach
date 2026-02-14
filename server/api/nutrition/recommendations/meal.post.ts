import { getServerSession } from '../../../utils/session'
import { recommendNutritionMealTask } from '../../../../trigger/recommend-nutrition-meal'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = (session.user as any).id
  const body = await readBody(event)

  if (!body.date) {
    throw createError({ statusCode: 400, message: 'Date is required' })
  }

  const handle = await recommendNutritionMealTask.trigger(
    {
      userId,
      date: body.date,
      windowType: body.windowType,
      forceLlm: body.forceLlm,
      targetCarbs: body.targetCarbs,
      targetProtein: body.targetProtein,
      targetKcal: body.targetKcal
    },
    {
      concurrencyKey: userId,
      tags: [`user:${userId}`]
    }
  )

  // We need to find the recommendation record created by the service if we want to return it here,
  // but since the service creates it, we might want to return the Trigger handle and let the frontend
  // wait for the task result which returns the recommendation object.
  // Actually, the service creates the record BEFORE returning.
  // Let's modify the service or the API to be more coordinated.

  return {
    success: true,
    runId: handle.id
  }
})
