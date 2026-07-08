import { requireAuth } from '../../utils/auth-guard'
import { teamRepository } from '../../utils/repositories/teamRepository'
import { coachingRepository } from '../../utils/repositories/coachingRepository'
import { prisma } from '../../utils/db'

function mapJoinAcceptError(error: unknown): never {
  const message = error instanceof Error ? error.message : 'Failed to accept invitation'

  const statusByMessage: Record<string, number> = {
    'Invalid or expired invite code': 404,
    'Athlete account not found': 404,
    'This invite is restricted to another email address': 403,
    'You cannot invite yourself': 400,
    'You cannot coach yourself': 400
  }

  const statusCode = statusByMessage[message] ?? 500

  throw createError({ statusCode, message })
}

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
    try {
      const membership = await teamRepository.acceptInvite(user.id, code)
      return {
        success: true,
        type: 'TEAM',
        teamId: membership.teamId
      }
    } catch (error) {
      mapJoinAcceptError(error)
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
    try {
      await coachingRepository.connectAthleteWithCode(user.id, code)
      return {
        success: true,
        type: 'COACHING'
      }
    } catch (error) {
      mapJoinAcceptError(error)
    }
  }

  // 3. Check coach-generated athlete invites
  const coachAthleteInvite = await coachingRepository.getCoachAthleteInviteByCode(code)

  if (
    coachAthleteInvite &&
    coachAthleteInvite.status === 'PENDING' &&
    coachAthleteInvite.expiresAt > new Date()
  ) {
    try {
      const relationship = await coachingRepository.acceptAthleteInviteForCoach(user.id, code)
      return {
        success: true,
        type: 'ATHLETE_INVITE',
        coachId: relationship.coachId
      }
    } catch (error) {
      mapJoinAcceptError(error)
    }
  }

  throw createError({
    statusCode: 404,
    message: 'Invalid or expired invitation code'
  })
})
