import { requireAuth } from '../../../../utils/auth-guard'
import { teamRepository } from '../../../../utils/repositories/teamRepository'

defineRouteMeta({
  openAPI: {
    tags: ['Coaching', 'Teams'],
    summary: 'Get team roster',
    description: 'Returns the list of athletes in a team with their metrics.',
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
  const user = await requireAuth(event, ['coaching:read'])
  const teamId = getRouterParam(event, 'id')

  if (!teamId) {
    throw createError({ statusCode: 400, message: 'Team ID is required' })
  }

  // Check if user is a member of the team (any role)
  const hasAccess = await teamRepository.checkTeamAccess(teamId, user.id)
  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      message: 'You must be a member of the team to view the roster'
    })
  }

  // Only team staff (OWNER, ADMIN, COACH) can see the full roster with detailed metrics
  const isStaff = await teamRepository.checkTeamAccess(teamId, user.id, ['OWNER', 'ADMIN', 'COACH'])

  return await teamRepository.getTeamRoster(teamId, { maskSensitiveData: !isStaff })
})
