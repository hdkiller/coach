import { requireAuth } from '../../utils/auth-guard'
import { prisma } from '../../utils/db'
import { resolveCoachPublicProfile } from '../../utils/public-presence'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['profile:read'])

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      publicAuthorSlug: true,
      publicDisplayName: true,
      publicBio: true,
      publicLocation: true,
      publicWebsiteUrl: true,
      publicSocialLinks: true,
      publicCoachingBrand: true,
      coachProfileEnabled: true,
      coachProfileSlug: true,
      coachPublicPage: true,
      image: true,
      name: true
    }
  })

  return {
    profile,
    coachProfile: profile ? resolveCoachPublicProfile(profile) : null
  }
})
