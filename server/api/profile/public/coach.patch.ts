import { requireAuth } from '../../../utils/auth-guard'
import { prisma } from '../../../utils/db'
import { toPrismaNullableJsonValue } from '../../../utils/prisma-json'
import { normalizeCoachPublicProfile } from '../../../utils/public-presence'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['profile:write'])
  const body = await readBody(event)
  const profile = normalizeCoachPublicProfile(body)

  const updateData: Record<string, any> = {
    coachProfileEnabled: profile.settings.enabled,
    coachProfileSlug: profile.settings.slug,
    coachPublicPage: toPrismaNullableJsonValue(profile),
    publicAuthorSlug: profile.settings.slug,
    publicDisplayName: profile.settings.displayName,
    publicBio: profile.settings.bio,
    publicLocation: profile.settings.location,
    publicWebsiteUrl: profile.settings.websiteUrl,
    publicSocialLinks: toPrismaNullableJsonValue(profile.settings.socialLinks),
    publicCoachingBrand: profile.settings.coachingBrand,
    visibility: profile.settings.visibility
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: updateData
    })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      throw createError({ statusCode: 409, message: 'That coach slug is already in use.' })
    }
    throw error
  }

  return { success: true, profile }
})
