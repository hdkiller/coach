import { requireAuth } from '../../utils/auth-guard'
import { prisma } from '../../utils/db'
import { toPrismaNullableJsonValue } from '../../utils/prisma-json'
import { normalizeCoachPublicProfile } from '../../utils/public-presence'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['profile:write'])
  const body = await readBody(event)
  const normalizedProfile = normalizeCoachPublicProfile({
    settings: {
      enabled: Boolean(body?.enabled ?? true),
      slug: body?.publicAuthorSlug,
      displayName: body?.publicDisplayName,
      coachingBrand: body?.publicCoachingBrand,
      location: body?.publicLocation,
      websiteUrl: body?.publicWebsiteUrl,
      bio: body?.publicBio,
      visibility: body?.visibility || 'Private',
      socialLinks: body?.publicSocialLinks || [],
      ctaUrl: body?.publicWebsiteUrl
    }
  })

  const profile = await prisma.user.update({
    where: { id: user.id },
    data: {
      coachProfileEnabled: normalizedProfile.settings.enabled,
      coachProfileSlug: normalizedProfile.settings.slug,
      coachPublicPage: toPrismaNullableJsonValue(normalizedProfile),
      publicAuthorSlug: normalizedProfile.settings.slug,
      publicDisplayName: normalizedProfile.settings.displayName,
      publicBio: normalizedProfile.settings.bio,
      publicLocation: normalizedProfile.settings.location,
      publicWebsiteUrl: normalizedProfile.settings.websiteUrl,
      publicSocialLinks: toPrismaNullableJsonValue(normalizedProfile.settings.socialLinks),
      publicCoachingBrand: normalizedProfile.settings.coachingBrand,
      visibility: normalizedProfile.settings.visibility
    } as any,
    select: {
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
      coachPublicPage: true,
      image: true,
      name: true
    }
  })

  return { success: true, profile }
})
