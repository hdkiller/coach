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

  // Team staff can access invites; coaches only need athlete invites for roster onboarding.
  const isStaff = await teamRepository.checkTeamAccess(teamId, user.id, ['OWNER', 'ADMIN', 'COACH'])
  if (!isStaff) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const invites = await teamRepository.getTeamInvites(teamId)
  const isAdmin = await teamRepository.checkTeamAccess(teamId, user.id, ['OWNER', 'ADMIN'])

  return isAdmin ? invites : invites.filter((invite: any) => invite.role === 'ATHLETE')
})
