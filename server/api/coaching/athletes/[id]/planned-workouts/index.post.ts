import { requireAuth } from '../../../../../utils/auth-guard'
import { z } from 'zod/v3'
import { createPlannedWorkoutForUser } from '../../../../../utils/planned-workout-service'
import { requireCoachAccessToAthlete } from '../../../../../utils/coaching-auth'

const paramsSchema = z.object({
  id: z.string()
})

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const { id: athleteId } = await getValidatedRouterParams(event, paramsSchema.parse)
  await requireCoachAccessToAthlete(event, athleteId, ['coaching:write'])
  const body = await readBody(event)
  return await createPlannedWorkoutForUser(athleteId, body)
})
