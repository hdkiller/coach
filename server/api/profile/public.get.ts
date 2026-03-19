import { requireAuth } from '../../utils/auth-guard'

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
      image: true,
      name: true
    }
  })

  return { profile }
})
