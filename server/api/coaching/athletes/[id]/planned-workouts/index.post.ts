import { z } from 'zod'
import { createPlannedWorkoutForUser } from '../../../../../utils/planned-workout-service'
import { requireCoachAccessToAthlete } from '../../../../../utils/coaching-auth'

const paramsSchema = z.object({
  id: z.string()
})

export default defineEventHandler(async (event) => {
  const { id: athleteId } = await getValidatedRouterParams(event, paramsSchema.parse)
  await requireCoachAccessToAthlete(event, athleteId)
  const body = await readBody(event)
  return await createPlannedWorkoutForUser(athleteId, body)
})
