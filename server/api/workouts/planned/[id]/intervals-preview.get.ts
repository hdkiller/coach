import { prisma } from '../../../../utils/db'
import { getServerSession } from '../../../../utils/session'
import { WorkoutConverter } from '../../../../utils/workout-converter'
import { sportSettingsRepository } from '../../../../utils/repositories/sportSettingsRepository'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Workout ID is required' })
  }

  const userId = (session.user as any).id

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
  if (!workout.structuredWorkout) {
    return { intervalsDescription: '', hasStructure: false }
  }

  const sportSettings = await sportSettingsRepository.getForActivityType(userId, workout.type || '')

  const workoutData = {
    title: workout.title,
    description: workout.description || '',
    type: workout.type || '',
    steps: (workout.structuredWorkout as any).steps || [],
    exercises: (workout.structuredWorkout as any).exercises || [],
    messages: (workout.structuredWorkout as any).messages || [],
    ftp: workout.user?.ftp || 250,
    sportSettings: sportSettings || undefined,
    generationSettingsSnapshot:
      (workout as any).lastGenerationSettingsSnapshot ||
      (workout as any).createdFromSettingsSnapshot ||
      null
  }

  const intervalsDescription = WorkoutConverter.toIntervalsICU(workoutData)
  return { intervalsDescription, hasStructure: true }
})
