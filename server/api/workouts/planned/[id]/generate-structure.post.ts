import { getServerSession } from '../../../../utils/session'
import { prisma } from '../../../../utils/db'
import { tasks } from '@trigger.dev/sdk/v3'
import { checkQuota } from '../../../../utils/quotas/engine'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  const userId = session.user.id

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Workout ID is required' })
  }

  // Verify ownership and load necessary fields
  const workout = await prisma.plannedWorkout.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      title: true,
      date: true,
      user: {
        select: {
          subscriptionTier: true,
          isAdmin: true,
          timezone: true
        }
      }
    }
  })

  if (!workout) {
    throw createError({ statusCode: 404, message: 'Planned workout not found' })
  }

  // Verify ownership
  if (workout.userId !== userId) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  // 0. Quota Check
  await checkQuota(userId, 'generate_structured_workout')

  // Subscription Limit Check
  if (workout.user.subscriptionTier === 'FREE') {
    const { getUserLocalDate } = await import('../../../../utils/date')
    const timezone = workout.user.timezone || 'UTC'
    const today = getUserLocalDate(timezone)
    const fourWeeksFromNow = new Date(today)
    fourWeeksFromNow.setUTCDate(today.getUTCDate() + 28)

    if (workout.date > fourWeeksFromNow) {
      throw createError({
        statusCode: 403,
        message:
          'Structured workout generation is limited to 4 weeks in advance for free users. Please upgrade to Pro to plan further ahead.'
      })
    }
  }

  // Trigger the generation task
  try {
    const handle = await tasks.trigger(
      'generate-structured-workout',
      {
        plannedWorkoutId: id
      },
      {
        concurrencyKey: userId,
        tags: [`user:${userId}`]
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
