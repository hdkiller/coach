import { requireAuth } from '../../../../../../utils/auth-guard'
import { z } from 'zod/v3'
import { requireCoachAccessToAthlete } from '../../../../../../utils/coaching-auth'
import { movePlannedWorkoutForUser } from '../../../../../../utils/planned-workout-service'

const paramsSchema = z.object({
  id: z.string(),
  workoutId: z.string()
})

const bodySchema = z.object({
  targetDate: z.string().datetime()
})

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const { id: athleteId, workoutId } = await getValidatedRouterParams(event, paramsSchema.parse)
  await requireCoachAccessToAthlete(event, athleteId, ['coaching:write'])
  const body = await readBody(event)
  const parsed = bodySchema.parse(body)
  return await movePlannedWorkoutForUser(athleteId, workoutId, parsed.targetDate)
})
