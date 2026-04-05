import { requireAuth } from '../../../utils/auth-guard'
import { prisma } from '../../../utils/db'
import { resolveAthletePublicProfile } from '../../../utils/public-presence'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['profile:read'])

  const profileUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      athleteProfileEnabled: true,
      athleteProfileSlug: true,
      athletePublicPage: true
    }
  })

  if (!profileUser) {
    throw createError({ statusCode: 404, message: 'User not found.' })
  }

  return {
    profile: resolveAthletePublicProfile(profileUser)
  }
})
