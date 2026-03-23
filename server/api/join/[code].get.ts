import { prisma } from '../../utils/db'

defineRouteMeta({
  openAPI: {
    tags: ['Coaching', 'Invites'],
    summary: 'Get invite details',
    description: 'Returns metadata for a coaching or team invitation code.',
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
  const code = getRouterParam(event, 'code')?.toUpperCase()

  if (!code) {
    throw createError({ statusCode: 400, message: 'Code is required' })
  }

  // 1. Check TeamInvite
  const teamInvite = await (prisma as any).teamInvite.findUnique({
    where: { code },
    include: {
      team: { select: { id: true, name: true, description: true } },
      group: { select: { id: true, name: true } }
    }
  })

  if (teamInvite && teamInvite.status === 'PENDING' && teamInvite.expiresAt > new Date()) {
    return {
      type: 'TEAM',
      id: teamInvite.id,
      name: teamInvite.team.name,
      description: teamInvite.team.description,
      role: teamInvite.role,
      groupName: teamInvite.group?.name,
      teamId: teamInvite.teamId
    }
  }

  // 2. Check CoachingInvite
  const coachingInvite = await (prisma as any).coachingInvite.findUnique({
    where: { code },
    include: {
      athlete: { select: { id: true, name: true, image: true, email: true } }
    }
  })

  if (
    coachingInvite &&
    coachingInvite.status === 'PENDING' &&
    coachingInvite.expiresAt > new Date()
  ) {
    return {
      type: 'COACHING',
      id: coachingInvite.id,
      name: coachingInvite.athlete.name || coachingInvite.athlete.email,
      image: coachingInvite.athlete.image,
      athleteId: coachingInvite.athleteId
    }
  }

  throw createError({
    statusCode: 404,
    message: 'Invalid or expired invitation code'
  })
})
