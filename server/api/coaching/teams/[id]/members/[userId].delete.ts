import { requireAuth } from '../../../../../utils/auth-guard'
import { teamRepository } from '../../../../../utils/repositories/teamRepository'

defineRouteMeta({
  openAPI: {
    tags: ['Coaching', 'Teams'],
    summary: 'Remove team member',
    description:
      'Removes a member from the team. Owners and admins can remove others; members can leave themselves.',
    inputSchema: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      },
      {
        name: 'userId',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      }
    ],
    responses: {
      200: { description: 'Success' },
      400: { description: 'Invalid input' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
      404: { description: 'Member not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['coaching:write'])
  const teamId = getRouterParam(event, 'id')
  const targetUserId = getRouterParam(event, 'userId')

  if (!teamId || !targetUserId) {
    throw createError({ statusCode: 400, message: 'Team ID and user ID are required' })
  }

  const isMember = await teamRepository.checkTeamAccess(teamId, user.id)
  if (!isMember) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const target = await teamRepository.getTeamMember(teamId, targetUserId)
  if (!target || target.status !== 'ACTIVE') {
    throw createError({ statusCode: 404, message: 'Team member not found' })
  }

  const isSelf = user.id === targetUserId
  const isOwner = await teamRepository.checkTeamAccess(teamId, user.id, ['OWNER'])
  const isAdmin = await teamRepository.checkTeamAccess(teamId, user.id, ['OWNER', 'ADMIN'])

  if (!isSelf) {
    if (!isAdmin) {
      throw createError({ statusCode: 403, message: 'Only owners and admins can remove members' })
    }
    // Only owners can remove other owners
    if (target.role === 'OWNER' && !isOwner) {
      throw createError({ statusCode: 403, message: 'Only owners can remove other owners' })
    }
  }

  if (target.role === 'OWNER') {
    const ownerCount = await teamRepository.countActiveMembersWithRole(teamId, 'OWNER')
    if (ownerCount <= 1) {
      throw createError({
        statusCode: 400,
        message: isSelf
          ? 'You cannot leave as the sole team owner'
          : 'Cannot remove the last team owner'
      })
    }
  }

  await teamRepository.removeTeamMember(teamId, targetUserId)

  return { success: true }
})
