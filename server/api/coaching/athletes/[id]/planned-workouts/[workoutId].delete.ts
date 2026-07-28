import { requireAuth } from '../../../../../utils/auth-guard'
import { z } from 'zod/v3'
import { requireCoachAccessToAthlete } from '../../../../../utils/coaching-auth'
import { deletePlannedWorkoutForUser } from '../../../../../utils/planned-workout-service'

const paramsSchema = z.object({
  id: z.string(),
  workoutId: z.string()
})

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const { id: athleteId, workoutId } = await getValidatedRouterParams(event, paramsSchema.parse)
  await requireCoachAccessToAthlete(event, athleteId, ['coaching:write'])
  return await deletePlannedWorkoutForUser(athleteId, workoutId)
})
