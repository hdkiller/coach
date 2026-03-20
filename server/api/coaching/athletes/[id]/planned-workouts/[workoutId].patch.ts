import { z } from 'zod'
import { requireCoachAccessToAthlete } from '../../../../../utils/coaching-auth'
import { updatePlannedWorkoutForUser } from '../../../../../utils/planned-workout-service'

const paramsSchema = z.object({
  id: z.string(),
  workoutId: z.string()
})

export default defineEventHandler(async (event) => {
  const { id: athleteId, workoutId } = await getValidatedRouterParams(event, paramsSchema.parse)
  await requireCoachAccessToAthlete(event, athleteId)
  const body = await readBody(event)
  return await updatePlannedWorkoutForUser(athleteId, workoutId, body)
})
