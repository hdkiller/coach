import { prisma } from '../../../../utils/db'
import { getServerSession } from '../../../../utils/session'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const workoutId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { trainingWeekId } = body

  if (!workoutId || !trainingWeekId) {
    throw createError({ statusCode: 400, message: 'Missing parameters' })
  }

  // Verify ownership
  const workout = await prisma.plannedWorkout.findUnique({
    where: { id: workoutId }
  })

  if (!workout || workout.userId !== (session.user as any).id) {
    throw createError({ statusCode: 404, message: 'Workout not found' })
  }

  // Update
  await prisma.plannedWorkout.update({
    where: { id: workoutId },
    data: { trainingWeekId }
  })

  return { success: true }
})
