import { requireAuth } from '../../utils/auth-guard'
import { normalizePublicAuthorSlug, publicAuthorProfileSchema } from '../../utils/public-plans'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['profile:write'])
  const body = await readValidatedBody(event, publicAuthorProfileSchema.parse)

  const data = {
    ...body,
    publicAuthorSlug: normalizePublicAuthorSlug(body.publicAuthorSlug)
  }

  const profile = await prisma.user.update({
    where: { id: user.id },
    data,
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

  return { success: true, profile }
})
