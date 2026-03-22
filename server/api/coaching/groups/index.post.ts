import { z } from 'zod'
import { requireAuth } from '../../../utils/auth-guard'
import { teamRepository } from '../../../utils/repositories/teamRepository'

const createGroupSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  teamId: z.string().optional()
})

defineRouteMeta({
  openAPI: {
    tags: ['Coaching', 'Groups'],
    summary: 'Create athlete group',
    description:
      'Creates a new athlete group for the authenticated coach, optionally scoped to a team.',
    responses: {
      201: { description: 'Created' },
      400: { description: 'Invalid input' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['coaching:write'])
  const body = await readBody(event)
  const result = createGroupSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid input',
      data: result.error.issues
    })
  }

  const { teamId } = result.data

  if (teamId) {
    // To create a group within a team, user must be at least a COACH or ADMIN/OWNER in that team
    const hasAccess = await teamRepository.checkTeamAccess(teamId, user.id, [
      'OWNER',
      'ADMIN',
      'COACH'
    ])
    if (!hasAccess) {
      throw createError({
        statusCode: 403,
        message: 'Insufficient permissions to create a team-scoped group'
      })
    }
  }

  const group = await teamRepository.createGroup(user.id, result.data)

  setResponseStatus(event, 201)
  return group
})
