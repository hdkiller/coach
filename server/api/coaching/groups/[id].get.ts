import { requireAuth } from '../../../utils/auth-guard'
import { teamRepository } from '../../../utils/repositories/teamRepository'

defineRouteMeta({
  openAPI: {
    tags: ['Coaching', 'Groups'],
    summary: 'Get athlete group details',
    description: 'Returns the details and members of a specific athlete group.',
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
      404: { description: 'Group not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['coaching:read'])
  const groupId = getRouterParam(event, 'id')

  if (!groupId) {
    throw createError({ statusCode: 400, message: 'Group ID is required' })
  }

  const group = await teamRepository.getGroupDetails(groupId)
  if (!group) {
    throw createError({ statusCode: 404, message: 'Group not found' })
  }

  // Permission Check
  if (group.teamId) {
    // If team-scoped, any team member with access can see it
    const hasAccess = await teamRepository.checkTeamAccess(group.teamId, user.id)
    if (!hasAccess) {
      throw createError({
        statusCode: 403,
        message: 'You do not have access to this team-scoped group'
      })
    }
  } else {
    // If private, only the owner can see it
    if (group.coachId !== user.id) {
      throw createError({ statusCode: 403, message: 'You do not own this group' })
    }
  }

  return group
})
