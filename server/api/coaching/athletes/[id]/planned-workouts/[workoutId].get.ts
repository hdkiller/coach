import { z } from 'zod'
import { requireCoachAccessToAthlete } from '../../../../../utils/coaching-auth'
import { plannedWorkoutRepository } from '../../../../../utils/repositories/plannedWorkoutRepository'

const paramsSchema = z.object({
  id: z.string(),
  workoutId: z.string()
})

export default defineEventHandler(async (event) => {
  const { id: athleteId, workoutId } = await getValidatedRouterParams(event, paramsSchema.parse)
  await requireCoachAccessToAthlete(event, athleteId)
  const workout = await plannedWorkoutRepository.getById(workoutId, athleteId)
  if (!workout) {
    throw createError({ statusCode: 404, message: 'Workout not found' })
  }
  return workout
})
