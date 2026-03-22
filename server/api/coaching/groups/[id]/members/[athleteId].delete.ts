import { requireAuth } from '../../../../../utils/auth-guard'
import { teamRepository } from '../../../../../utils/repositories/teamRepository'

defineRouteMeta({
  openAPI: {
    tags: ['Coaching', 'Groups'],
    summary: 'Remove athlete from group',
    description: 'Removes an athlete from a specific athlete group.',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'The ID of the group'
      },
      {
        name: 'athleteId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'The ID of the athlete to remove'
      }
    ],
    responses: {
      200: { description: 'Success' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
      404: { description: 'Group or member not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['coaching:write'])
  const groupId = getRouterParam(event, 'id')
  const athleteId = getRouterParam(event, 'athleteId')

  if (!groupId || !athleteId) {
    throw createError({ statusCode: 400, message: 'Group ID and Athlete ID are required' })
  }

  const group = await teamRepository.getGroupDetails(groupId)
  if (!group) {
    throw createError({ statusCode: 404, message: 'Group not found' })
  }

  // Permission Check: Owner or Team Coach/Admin
  if (group.teamId) {
    const hasAccess = await teamRepository.checkTeamAccess(group.teamId, user.id, [
      'OWNER',
      'ADMIN',
      'COACH'
    ])
    if (!hasAccess) {
      throw createError({
        statusCode: 403,
        message: 'Insufficient permissions for this team group'
      })
    }
  } else {
    if (group.coachId !== user.id) {
      throw createError({ statusCode: 403, message: 'You do not own this group' })
    }
  }

  return await teamRepository.removeAthleteFromGroup(groupId, athleteId)
})
