import { getServerSession } from '#auth'
import { prisma } from '../../../utils/db'
import { resolveAthletePublicProfile } from '../../../utils/public-presence'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, message: 'Athlete slug is required.' })
  }

  const session = await getServerSession(event)

  const user = await prisma.user.findFirst({
    where: {
      athleteProfileSlug: slug,
      athleteProfileEnabled: true
    },
    select: {
      id: true,
      name: true,
      image: true,
      athleteProfileEnabled: true,
      athleteProfileSlug: true,
      athletePublicPage: true
    }
  })

  if (!user) {
    throw createError({ statusCode: 404, message: 'Athlete profile not found.' })
  }

  const profile = resolveAthletePublicProfile(user)

  return {
    ownerId: user.id,
    author: {
      image: user.image,
      name: user.name
    },
    profile: {
      ...profile,
      sections: [...profile.sections]
        .filter((section) => section.enabled)
        .sort((a, b) => a.order - b.order)
    },
    viewer: {
      isOwner: (session?.user as any)?.id === user.id
    }
  }
})
