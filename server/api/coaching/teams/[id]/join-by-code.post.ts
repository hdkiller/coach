import { z } from 'zod'
import { requireAuth } from '../../../../utils/auth-guard'
import { teamRepository } from '../../../../utils/repositories/teamRepository'

const joinByCodeSchema = z.object({
  code: z.string().min(6).max(10)
})

defineRouteMeta({
  openAPI: {
    tags: ['Coaching', 'Teams'],
    summary: 'Add athlete by code',
    description: 'Adds an athlete to the team using their personal coaching invite code.',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      }
    ],
    responses: {
      200: { description: 'Success' },
      400: { description: 'Invalid input' },
      403: { description: 'Forbidden' },
      404: { description: 'Invite not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['coaching:write'])
  const teamId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const result = joinByCodeSchema.safeParse(body)

  if (!teamId || !result.success) {
    throw createError({ statusCode: 400, message: 'Invalid input' })
  }

  // Permission Check: Must be staff
  const isStaff = await teamRepository.checkTeamAccess(teamId, user.id, ['OWNER', 'ADMIN', 'COACH'])
  if (!isStaff) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  try {
    const membership = await teamRepository.addAthleteToTeamByPersonalCode(
      teamId,
      user.id,
      result.data.code.toUpperCase()
    )
    return { success: true, membership }
  } catch (err: any) {
    throw createError({
      statusCode: 400,
      message: err.message || 'Failed to add athlete by code'
    })
  }
})
