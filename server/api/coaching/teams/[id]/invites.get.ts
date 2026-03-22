import { requireAuth } from '../../../../utils/auth-guard'
import { teamRepository } from '../../../../utils/repositories/teamRepository'

defineRouteMeta({
  openAPI: {
    tags: ['Coaching', 'Teams'],
    summary: 'List team invites',
    description: 'Returns the list of pending invites for a team.',
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
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['coaching:write'])
  const teamId = getRouterParam(event, 'id')

  if (!teamId) {
    throw createError({ statusCode: 400, message: 'Team ID is required' })
  }

  // Only admins/owners can see invites
  const isAdmin = await teamRepository.checkTeamAccess(teamId, user.id, ['OWNER', 'ADMIN'])
  if (!isAdmin) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  return await teamRepository.getTeamInvites(teamId)
})
