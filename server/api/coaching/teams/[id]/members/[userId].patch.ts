import { z } from 'zod/v3'
import { requireAuth } from '../../../../../utils/auth-guard'
import { teamRepository } from '../../../../../utils/repositories/teamRepository'

const updateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'COACH', 'ATHLETE'])
})

defineRouteMeta({
  openAPI: {
    tags: ['Coaching', 'Teams'],
    summary: 'Update team member role',
    description:
      'Updates a team member role. Owners and admins can change roles; only owners can assign admin.',
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
  const body = await readBody(event)
  const result = updateRoleSchema.safeParse(body)

  if (!teamId || !targetUserId || !result.success) {
    throw createError({ statusCode: 400, message: 'Invalid input' })
  }

  const canManage = await teamRepository.checkTeamAccess(teamId, user.id, ['OWNER', 'ADMIN'])
  if (!canManage) {
    throw createError({ statusCode: 403, message: 'Only owners and admins can change roles' })
  }

  const target = await teamRepository.getTeamMember(teamId, targetUserId)
  if (!target || target.status !== 'ACTIVE') {
    throw createError({ statusCode: 404, message: 'Team member not found' })
  }

  const nextRole = result.data.role

  if (nextRole === 'ADMIN') {
    const isOwner = await teamRepository.checkTeamAccess(teamId, user.id, ['OWNER'])
    if (!isOwner) {
      throw createError({ statusCode: 403, message: 'Only team owners can assign admin role' })
    }
  }

  // nextRole is ADMIN | COACH | ATHLETE only — assigning it to an OWNER is always a demotion
  if (target.role === 'OWNER') {
    const isOwner = await teamRepository.checkTeamAccess(teamId, user.id, ['OWNER'])
    if (!isOwner) {
      throw createError({ statusCode: 403, message: 'Only owners can demote other owners' })
    }
    const ownerCount = await teamRepository.countActiveMembersWithRole(teamId, 'OWNER')
    if (ownerCount <= 1) {
      throw createError({ statusCode: 400, message: 'Cannot demote the last team owner' })
    }
  }

  const membership = await teamRepository.updateMemberRole(teamId, targetUserId, nextRole)
  return membership
})
