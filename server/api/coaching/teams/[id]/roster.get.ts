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

  // Only team staff (OWNER, ADMIN, COACH) can see the full roster
  const isStaff = await teamRepository.checkTeamAccess(teamId, user.id, ['OWNER', 'ADMIN', 'COACH'])
  if (!isStaff) {
    throw createError({ statusCode: 403, message: 'Only team staff can view the athlete roster' })
  }

  return await teamRepository.getTeamRoster(teamId)
})
