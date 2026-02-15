import { getServerSession } from '../../../../utils/session'
import { prisma } from '../../../../utils/db'
import { WorkoutParser } from '../../../../utils/workout-parser'
import { WorkoutConverter } from '../../../../utils/workout-converter'
import { syncPlannedWorkoutToIntervals } from '../../../../utils/intervals-sync'

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

  const body = await readBody(event)
  const { text } = body

  if (typeof text !== 'string') {
    throw createError({ statusCode: 400, message: 'Structure text is required' })
  }

  // 1. Verify ownership
  const workout = await prisma.plannedWorkout.findUnique({
    where: { id },
    include: {
      user: {
        select: { ftp: true }
      }
    }
  })

  if (!workout) {
    throw createError({ statusCode: 404, message: 'Planned workout not found' })
  }

  if (workout.userId !== userId) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  // 2. Parse text to JSON
  const steps = WorkoutParser.parseIntervalsICU(text)

  // 3. Update DB
  const updatedWorkout = await prisma.plannedWorkout.update({
    where: { id },
    data: {
      structuredWorkout: {
        ...(workout.structuredWorkout as any || {}),
        steps
      },
      modifiedLocally: true,
      syncStatus: workout.syncStatus === 'SYNCED' ? 'SYNCED' : workout.syncStatus
    }
  })

  // 4. If already synced to Intervals, push update
  if (workout.syncStatus === 'SYNCED') {
    // Convert structure back to text to ensure it's clean (or just send the raw text from user)
    // Sending the raw text from user is better as it preserves comments/formatting Intervals might like.
    await syncPlannedWorkoutToIntervals(
      'UPDATE',
      {
        ...updatedWorkout,
        workout_doc: text // Preserving user's text exactly for Intervals
      },
      userId
    )
  }

  return {
    success: true,
    workout: updatedWorkout
  }
})
