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

  const template = await (prisma as any).workoutTemplate.findUnique({
    where: { id, userId }
  })

  if (!template) {
    throw createError({ statusCode: 404, message: 'Workout template not found' })
  }

  if (!template.structuredWorkout) {
    return { intervalsDescription: '', hasStructure: false }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { ftp: true }
  })

  const sportSettings = await sportSettingsRepository.getForActivityType(
    userId,
    template.type || ''
  )

  const workoutData = {
    title: template.title,
    description: template.description || '',
    type: template.type || '',
    steps: (template.structuredWorkout as any).steps || [],
    exercises: (template.structuredWorkout as any).exercises || [],
    messages: (template.structuredWorkout as any).messages || [],
    ftp: user?.ftp || 250,
    sportSettings: sportSettings || undefined,
    generationSettingsSnapshot:
      (template as any).lastGenerationSettingsSnapshot ||
      (template as any).createdFromSettingsSnapshot ||
      null
  }

  const intervalsDescription = WorkoutConverter.toIntervalsICU(workoutData)
  return { intervalsDescription, hasStructure: true }
})
