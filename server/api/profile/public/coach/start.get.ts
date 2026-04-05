import { requireAuth } from '../../../../utils/auth-guard'
import { prisma } from '../../../../utils/db'
import { resolveCoachPublicProfile } from '../../../../utils/public-presence'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['profile:read'])

  const profileUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
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

  if (!profileUser) {
    throw createError({ statusCode: 404, message: 'User not found.' })
  }

  const profile = resolveCoachPublicProfile(profileUser)

  return {
    startPage: profile.startPage
  }
})
