import { requireAuth } from '../../../../../utils/auth-guard'
import { z } from 'zod/v3'
import { requireCoachAccessToAthlete } from '../../../../../utils/coaching-auth'
import { workoutRepository } from '../../../../../utils/repositories/workoutRepository'
import { attachStreamToWorkout } from '../../../../../utils/repositories/workoutStreamRepository'

const paramsSchema = z.object({
  id: z.string(),
  workoutId: z.string()
})

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const { id: athleteId, workoutId } = await getValidatedRouterParams(event, paramsSchema.parse)
  await requireCoachAccessToAthlete(event, athleteId)

  const workoutRecord = await workoutRepository.getById(workoutId, athleteId, {
    include: {
      plannedWorkout: true,
      planAdherence: true,
      personalBests: true
    }
  })

  if (!workoutRecord) {
    throw createError({ statusCode: 404, message: 'Workout not found' })
  }

  const workout = await attachStreamToWorkout(workoutRecord)

  return workout
})
