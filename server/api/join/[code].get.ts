import { prisma } from '../../utils/db'
import { coachingRepository } from '../../utils/repositories/coachingRepository'
import { buildCoachJoinExperience } from '../../utils/public-join'
import { resolveCoachPublicProfile } from '../../utils/public-presence'

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

  // 3. Check coach-generated athlete invites
  const coachAthleteInvite = await coachingRepository.getCoachAthleteInviteByCode(code)

  if (
    coachAthleteInvite &&
    coachAthleteInvite.status === 'PENDING' &&
    coachAthleteInvite.expiresAt > new Date()
  ) {
    const coachUser = await prisma.user.findUnique({
      where: { id: coachAthleteInvite.coachId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        visibility: true,
        publicAuthorSlug: true,
        publicDisplayName: true,
        publicBio: true,
        publicLocation: true,
        publicWebsiteUrl: true,
        publicSocialLinks: true,
        publicCoachingBrand: true,
        coachProfileEnabled: true,
        coachProfileSlug: true,
        coachPublicPage: true
      }
    })

    const profile = coachUser ? resolveCoachPublicProfile(coachUser) : null

    return {
      type: 'ATHLETE_INVITE',
      id: coachAthleteInvite.id,
      name: coachAthleteInvite.coach.name || coachAthleteInvite.coach.email,
      image: coachAthleteInvite.coach.image,
      email: coachAthleteInvite.email,
      coachJoin:
        coachUser && profile
          ? buildCoachJoinExperience({
              user: coachUser,
              profile,
              inviteCode: coachAthleteInvite.code,
              activeInviteAvailable: true
            })
          : null
    }
  }

  throw createError({
    statusCode: 404,
    message: 'Invalid or expired invitation code'
  })
})
