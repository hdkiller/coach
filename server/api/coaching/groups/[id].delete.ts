import { requireAuth } from '../../../utils/auth-guard'
import { teamRepository } from '../../../utils/repositories/teamRepository'

defineRouteMeta({
  openAPI: {
    tags: ['Coaching', 'Groups'],
    summary: 'Delete athlete group',
    description: 'Permanently deletes an athlete group and its memberships.',
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
      404: { description: 'Group not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['coaching:write'])
  const groupId = getRouterParam(event, 'id')

  if (!groupId) {
    throw createError({ statusCode: 400, message: 'Group ID is required' })
  }

  const group = await teamRepository.getGroupDetails(groupId)
  if (!group) {
    throw createError({ statusCode: 404, message: 'Group not found' })
  }

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
  } else if (group.coachId !== user.id) {
    throw createError({ statusCode: 403, message: 'You do not own this group' })
  }

  await teamRepository.deleteGroup(groupId)
  return { success: true }
})
