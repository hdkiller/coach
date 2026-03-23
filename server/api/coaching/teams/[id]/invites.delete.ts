import { z } from 'zod'
import { requireAuth } from '../../../../utils/auth-guard'
import { teamRepository } from '../../../../utils/repositories/teamRepository'

const deleteInviteSchema = z.object({
  inviteId: z.string().uuid()
})

defineRouteMeta({
  openAPI: {
    tags: ['Coaching', 'Teams'],
    summary: 'Revoke team invite',
    description: 'Revokes a pending team invite code.',
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
  const user = await requireAuth(event, ['coaching:write'])
  const teamId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const result = deleteInviteSchema.safeParse(body)

  if (!teamId || !result.success) {
    throw createError({ statusCode: 400, message: 'Invalid input' })
  }

  const isStaff = await teamRepository.checkTeamAccess(teamId, user.id, ['OWNER', 'ADMIN', 'COACH'])
  if (!isStaff) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const isAdmin = await teamRepository.checkTeamAccess(teamId, user.id, ['OWNER', 'ADMIN'])

  if (!isAdmin) {
    const invites = await teamRepository.getTeamInvites(teamId)
    const invite = invites.find((entry: any) => entry.id === result.data.inviteId)

    if (!invite || invite.role !== 'ATHLETE') {
      throw createError({ statusCode: 403, message: 'Coaches can only revoke athlete invites' })
    }
  }

  await teamRepository.revokeInvite(teamId, result.data.inviteId)

  return { success: true }
})
