import { requireAuth } from '../../../utils/auth-guard'
import { teamRepository } from '../../../utils/repositories/teamRepository'

defineRouteMeta({
  openAPI: {
    tags: ['Coaching', 'Teams'],
    summary: 'Delete team',
    description: 'Permanently deletes a team and its groups. Only the team owner may delete.',
    inputSchema: [
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
  const user = await requireAuth(event, ['coaching:write'])
  const teamId = getRouterParam(event, 'id')

  if (!teamId) {
    throw createError({ statusCode: 400, message: 'Team ID is required' })
  }

  const team = await teamRepository.getTeamDetails(teamId)
  if (!team) {
    throw createError({ statusCode: 404, message: 'Team not found' })
  }

  const isOwner = await teamRepository.checkTeamAccess(teamId, user.id, ['OWNER'])
  if (!isOwner) {
    throw createError({
      statusCode: 403,
      message: 'Only team owners can delete teams'
    })
  }

  await teamRepository.deleteTeam(teamId)
  return { success: true }
})
