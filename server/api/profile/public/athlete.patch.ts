import { requireAuth } from '../../../utils/auth-guard'
import { prisma } from '../../../utils/db'
import { toPrismaNullableJsonValue } from '../../../utils/prisma-json'
import { normalizeAthletePublicProfile } from '../../../utils/public-presence'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['profile:write'])
  const body = await readBody(event)
  const profile = normalizeAthletePublicProfile(body)

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        athleteProfileEnabled: profile.settings.enabled,
        athleteProfileSlug: profile.settings.slug,
        athletePublicPage: toPrismaNullableJsonValue(profile)
      }
    })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      throw createError({ statusCode: 409, message: 'That athlete slug is already in use.' })
    }
    throw error
  }

  return { success: true, profile }
})
