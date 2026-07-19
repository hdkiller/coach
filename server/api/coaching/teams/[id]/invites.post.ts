import { z } from 'zod/v3'
import { requireAuth } from '../../../../utils/auth-guard'
import { sendTeamInviteEmail } from '../../../../utils/team-invite-email'
import { teamRepository } from '../../../../utils/repositories/teamRepository'

const createInviteSchema = z.object({
  email: z.preprocess((val) => (val === '' ? undefined : val), z.string().email().optional()),
  role: z.enum(['ADMIN', 'COACH', 'ATHLETE']).default('ATHLETE'),
  groupId: z.string().optional()
})

defineRouteMeta({
  openAPI: {
    tags: ['Coaching', 'Teams'],
    summary: 'Create team invite',
    description: 'Generates a new invite code for the team.',
    inputSchema: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      }
    ],
    responses: {
      201: { description: 'Created' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['coaching:write'])
  const teamId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const result = createInviteSchema.safeParse(body)

  if (!teamId || !result.success) {
    throw createError({ statusCode: 400, message: 'Invalid input' })
  }

  // Team staff can create athlete invites; only admins/owners can create staff invites.
  const isStaff = await teamRepository.checkTeamAccess(teamId, user.id, ['OWNER', 'ADMIN', 'COACH'])
  if (!isStaff) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const isAdmin = await teamRepository.checkTeamAccess(teamId, user.id, ['OWNER', 'ADMIN'])

  if (result.data.role !== 'ATHLETE' && !isAdmin) {
    throw createError({ statusCode: 403, message: 'Only admins can invite staff members' })
  }

  // Safety: only OWNER can invite other ADMINS
  if (result.data.role === 'ADMIN') {
    const isOwner = await teamRepository.checkTeamAccess(teamId, user.id, ['OWNER'])
    if (!isOwner) {
      throw createError({ statusCode: 403, message: 'Only team owners can invite admins' })
    }
  }

  const invite = await teamRepository.createTeamInvite(teamId, result.data)

  if (invite.email) {
    const team = await teamRepository.getTeamDetails(teamId)
    const baseUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://coachwatts.com'
    const joinUrl = `${baseUrl}/join/${invite.code}`

    try {
      await sendTeamInviteEmail({
        to: invite.email,
        teamName: team?.name || 'a team',
        role: invite.role,
        joinUrl,
        code: invite.code
      })
    } catch (error: any) {
      await teamRepository.revokeInvite(teamId, invite.id)
      throw createError({
        statusCode: 500,
        message: error.message || 'Failed to send invitation email'
      })
    }
  }

  setResponseStatus(event, 201)
  return invite
})
