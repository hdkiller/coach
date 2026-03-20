import { getServerSession } from '../../../../utils/session'
import { movePlannedWorkoutForUser } from '../../../../utils/planned-workout-service'
import { z } from 'zod'

const moveSchema = z.object({
  targetDate: z.string().datetime()
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const workoutId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const validation = moveSchema.safeParse(body)

  if (!validation.success) {
    throw createError({ statusCode: 400, message: 'Invalid target date' })
  }

  const userId = (session.user as any).id
  return await movePlannedWorkoutForUser(userId, workoutId!, validation.data.targetDate)
})
