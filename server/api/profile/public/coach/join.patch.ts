import { requireAuth } from '../../../../utils/auth-guard'
import { prisma } from '../../../../utils/db'
import { toPrismaNullableJsonValue } from '../../../../utils/prisma-json'
import {
  resolveCoachPublicProfile,
  normalizeCoachPublicProfile
} from '../../../../utils/public-presence'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['profile:write'])
  const body = await readBody(event)

  const existingUser = await prisma.user.findUnique({
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

  if (!existingUser) {
    throw createError({ statusCode: 404, message: 'User not found.' })
  }

  const profile = resolveCoachPublicProfile(existingUser)
  const normalizedProfile = normalizeCoachPublicProfile({
    ...profile,
    joinPage: {
      ...profile.joinPage,
      ...(body || {})
    }
  })

  await prisma.user.update({
    where: { id: user.id },
    data: {
      coachPublicPage: toPrismaNullableJsonValue(normalizedProfile)
    }
  })

  return {
    success: true,
    joinPage: normalizedProfile.joinPage
  }
})
