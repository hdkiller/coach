import { z } from 'zod'
import { requireAuth } from '../../../../../utils/auth-guard'
import { teamRepository } from '../../../../../utils/repositories/teamRepository'

const addConnectedAthleteSchema = z.object({
  athleteId: z.string().uuid()
})

defineRouteMeta({
  openAPI: {
    tags: ['Coaching', 'Teams'],
    summary: 'Add connected athlete to team',
    description: 'Directly adds an athlete the coach is already coaching to the team.',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      }
    ],
    responses: {
      201: { description: 'Added' },
      400: { description: 'Invalid input' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['coaching:write'])
  const teamId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const result = addConnectedAthleteSchema.safeParse(body)

  if (!teamId || !result.success) {
    throw createError({ statusCode: 400, message: 'Invalid input' })
  }

  try {
    const membership = await teamRepository.addAthleteToTeamByCoach(
      teamId,
      user.id,
      result.data.athleteId
    )
    setResponseStatus(event, 201)
    return membership
  } catch (error: any) {
    throw createError({
      statusCode: 400,
      message: error.message || 'Failed to add athlete'
    })
  }
})
