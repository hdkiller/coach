import { requireAuth } from '../../../utils/auth-guard'
import { teamRepository } from '../../../utils/repositories/teamRepository'

defineRouteMeta({
  openAPI: {
    tags: ['Coaching', 'Teams'],
    summary: 'Get team details',
    description: 'Returns the details of a specific team if the user has access.',
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
      403: { description: 'Forbidden' },
      404: { description: 'Team not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['coaching:read'])
  const teamId = getRouterParam(event, 'id')

  if (!teamId) {
    throw createError({ statusCode: 400, message: 'Team ID is required' })
  }

  // Check if user is a member of the team
  const hasAccess = await teamRepository.checkTeamAccess(teamId, user.id)
  if (!hasAccess) {
    throw createError({ statusCode: 403, message: 'You do not have access to this team' })
  }

  const team = await teamRepository.getTeamDetails(teamId)
  if (!team) {
    throw createError({ statusCode: 404, message: 'Team not found' })
  }

  return team
})
