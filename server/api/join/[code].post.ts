import { requireAuth } from '../../utils/auth-guard'
import { teamRepository } from '../../utils/repositories/teamRepository'
import { coachingRepository } from '../../utils/repositories/coachingRepository'
import { prisma } from '../../utils/db'

defineRouteMeta({
  openAPI: {
    tags: ['Coaching', 'Invites'],
    summary: 'Accept invite',
    description: 'Accepts a coaching or team invitation code.',
    parameters: [
      {
        name: 'code',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      }
    ],
    responses: {
      200: { description: 'Success' },
      404: { description: 'Invite not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const code = getRouterParam(event, 'code')?.toUpperCase()

  if (!code) {
    throw createError({ statusCode: 400, message: 'Code is required' })
  }

  // 1. Check TeamInvite
  const teamInvite = await (prisma as any).teamInvite.findUnique({
    where: { code }
  })

  if (teamInvite && teamInvite.status === 'PENDING' && teamInvite.expiresAt > new Date()) {
    const membership = await teamRepository.acceptInvite(user.id, code)
    return {
      success: true,
      type: 'TEAM',
      teamId: membership.teamId
    }
  }

  // 2. Check CoachingInvite
  const coachingInvite = await (prisma as any).coachingInvite.findUnique({
    where: { code }
  })

  if (
    coachingInvite &&
    coachingInvite.status === 'PENDING' &&
    coachingInvite.expiresAt > new Date()
  ) {
    await coachingRepository.connectAthleteWithCode(user.id, code)
    return {
      success: true,
      type: 'COACHING'
    }
  }

  throw createError({
    statusCode: 404,
    message: 'Invalid or expired invitation code'
  })
})
