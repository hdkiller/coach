import { getServerSession } from '#auth'
import { prisma } from '../../../../utils/db'
import { coachingRepository } from '../../../../utils/repositories/coachingRepository'
import { resolveCoachPublicProfile } from '../../../../utils/public-presence'
import { buildCoachJoinExperience } from '../../../../utils/public-join'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, message: 'Coach slug is required.' })
  }

  const session = await getServerSession(event)

  const user = await prisma.user.findFirst({
    where: {
      AND: [
        { OR: [{ coachProfileSlug: slug }, { publicAuthorSlug: slug }] },
        { OR: [{ coachProfileEnabled: true }, { publicAuthorSlug: { not: null } }] }
      ]
    },
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

  if (!user) {
    throw createError({ statusCode: 404, message: 'Coach profile not found.' })
  }

  const profile = resolveCoachPublicProfile(user)
  const activeInvite = await coachingRepository.getActivePublicAthleteInviteForCoach(user.id)
  const viewerIsOwner = (session?.user as any)?.id === user.id
  const joinEnabled = profile.joinPage?.enabled !== false

  return {
    viewer: {
      isOwner: viewerIsOwner
    },
    fallbackToGenericJoin: !joinEnabled || !activeInvite,
    join: buildCoachJoinExperience({
      user,
      profile,
      inviteCode: activeInvite?.code || null,
      activeInviteAvailable: Boolean(activeInvite)
    })
  }
})
