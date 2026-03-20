import { requireAuth } from '../../../utils/auth-guard'
import { coachingRepository } from '../../../utils/repositories/coachingRepository'
import { z } from 'zod'

defineRouteMeta({
  openAPI: {
    tags: ['Coaching'],
    summary: 'Get athlete profile',
    description: 'Returns the details of a specific athlete coached by the authenticated user.',
    responses: {
      200: {
        description: 'Success'
      },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden (Not coaching this athlete)' },
      404: { description: 'Athlete not found' }
    }
  }
})

const paramsSchema = z.object({
  id: z.string()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['coaching:read'])
  const coachId = user.id

  const { id: athleteId } = await getValidatedRouterParams(event, paramsSchema.parse)

  console.log(`[Coaching API] Fetching athlete ${athleteId} for coach ${coachId}`)

  // 1. Verify the coaching relationship exists and is active
  const isCoaching = await coachingRepository.checkRelationship(coachId, athleteId)

  if (!isCoaching) {
    console.warn(
      `[Coaching API] Permission denied: Coach ${coachId} is not active for athlete ${athleteId}`
    )
    throw createError({
      statusCode: 403,
      message:
        "You do not have permission to view this athlete's profile. (Relationship not active)"
    })
  }

  // 2. Fetch the specific athlete's enriched data
  const athleteData = await coachingRepository.getEnrichedAthleteForCoach(coachId, athleteId)

  if (!athleteData) {
    console.error(
      `[Coaching API] Athlete ${athleteId} not found even though relationship is active`
    )
    throw createError({
      statusCode: 404,
      message: 'Athlete data not found'
    })
  }

  return athleteData
})
