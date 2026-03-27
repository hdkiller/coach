import { requireAuth } from '../../utils/auth-guard'
import { prisma } from '../../utils/db'
import { toPrismaNullableJsonValue } from '../../utils/prisma-json'
import { normalizePublicAuthorSlug, publicAuthorProfileSchema } from '../../utils/public-plans'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['profile:write'])
  const body = await readValidatedBody(event, publicAuthorProfileSchema.parse)

  const data = {
    ...body,
    publicAuthorSlug: normalizePublicAuthorSlug(body.publicAuthorSlug),
    ...(body.publicSocialLinks !== undefined
      ? { publicSocialLinks: toPrismaNullableJsonValue(body.publicSocialLinks) }
      : {})
  }

  const profile = await prisma.user.update({
    where: { id: user.id },
    data: data as any,
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
