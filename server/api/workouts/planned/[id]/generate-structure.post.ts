import { getServerSession } from '#auth'
import { prisma } from '../../../../utils/db'
import { tasks } from '@trigger.dev/sdk/v3'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.email) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  })

  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Workout ID is required' })
  }

  const workout = await prisma.plannedWorkout.findUnique({
    where: { id },
    select: { id: true, userId: true, title: true }
  })

  if (!workout) {
    throw createError({ statusCode: 404, message: 'Planned workout not found' })
  }

  // Verify ownership
  if (workout.userId !== user.id) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  // Trigger the generation task
  try {
    const handle = await tasks.trigger(
      'generate-structured-workout',
      {
        plannedWorkoutId: id
      },
      {
        tags: [`user:${user.id}`]
      }
    )

    return {
      success: true,
      taskId: handle.id,
      message: 'Workout structure generation started'
    }
  } catch (error) {
    console.error('Failed to trigger workout generation:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to start workout generation'
    })
  }
})
