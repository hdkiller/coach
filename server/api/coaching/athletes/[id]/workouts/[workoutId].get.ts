import { z } from 'zod'
import { requireCoachAccessToAthlete } from '../../../../../utils/coaching-auth'
import { workoutRepository } from '../../../../../utils/repositories/workoutRepository'

const paramsSchema = z.object({
  id: z.string(),
  workoutId: z.string()
})

export default defineEventHandler(async (event) => {
  const { id: athleteId, workoutId } = await getValidatedRouterParams(event, paramsSchema.parse)
  await requireCoachAccessToAthlete(event, athleteId)

  const workout = await workoutRepository.getById(workoutId, athleteId, {
    include: {
      streams: true,
      plannedWorkout: true,
      planAdherence: true,
      personalBests: true
    }
  })

  if (!workout) {
    throw createError({ statusCode: 404, message: 'Workout not found' })
  }

  return workout
})
