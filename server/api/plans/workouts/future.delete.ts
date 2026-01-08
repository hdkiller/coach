import { prisma } from '../../../utils/db'
import { deleteIntervalsPlannedWorkout } from '../../../utils/intervals'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = session.user.id
  const now = new Date()

  // Find all future planned workouts
  const workouts = await prisma.plannedWorkout.findMany({
    where: {
      userId,
      date: {
        gt: now
      }
    }
  })

  // If we have workouts to delete, try to remove them from Intervals.icu first
  if (workouts.length > 0) {
    // Fetch user's Intervals integration
    const integration = await prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'intervals'
        }
      }
    })

    if (integration) {
      // Process deletions in parallel with some concurrency limit if needed,
      // but for now Promise.allSettled is fine to ensure we attempt all.
      await Promise.allSettled(
        workouts.map(async (workout) => {
          if (workout.externalId) {
            try {
              await deleteIntervalsPlannedWorkout(integration, workout.externalId)
            } catch (error) {
              console.error(`Failed to delete Intervals workout ${workout.externalId}:`, error)
              // Continue - we still want to delete locally
            }
          }
        })
      )
    }
  }

  // Delete all future planned workouts locally
  const result = await prisma.plannedWorkout.deleteMany({
    where: {
      userId,
      date: {
        gt: now
      }
    }
  })

  return {
    success: true,
    count: result.count
  }
})
