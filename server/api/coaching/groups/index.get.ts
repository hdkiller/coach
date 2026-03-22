import { requireAuth } from '../../../utils/auth-guard'
import { teamRepository } from '../../../utils/repositories/teamRepository'

defineRouteMeta({
  openAPI: {
    tags: ['Coaching', 'Groups'],
    summary: 'List athlete groups',
    description:
      'Returns the list of athlete groups owned by the coach, and optionally team-scoped groups.',
    parameters: [
      {
        name: 'teamId',
        in: 'query',
        required: false,
        schema: { type: 'string' }
      }
    ],
    responses: {
      200: { description: 'Success' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['coaching:read'])
  const query = getQuery(event)
  const teamId = query.teamId as string | undefined

  if (teamId) {
    // If teamId is provided, check access to the team
    const hasAccess = await teamRepository.checkTeamAccess(teamId, user.id)
    if (!hasAccess) {
      throw createError({ statusCode: 403, message: 'Forbidden' })
    }
    return await teamRepository.getTeamGroups(teamId)
  }

  // Otherwise, return the coach's own groups
  return await teamRepository.getGroupsForCoach(user.id)
})
