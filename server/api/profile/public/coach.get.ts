import { requireAuth } from '../../../utils/auth-guard'
import { prisma } from '../../../utils/db'
import { resolveCoachPublicProfile } from '../../../utils/public-presence'
import { buildFeaturedPublicPlanPreview } from '../../../utils/public-plan-response'

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
      coachPublicPage: true,
      trainingPlans: {
        where: {
          visibility: 'PUBLIC',
          OR: [{ accessState: 'FREE' }, { accessState: 'RESTRICTED' }]
        },
        include: {
          user: {
            select: {
              name: true,
              image: true,
              publicAuthorSlug: true,
              publicDisplayName: true,
              publicBio: true,
              publicLocation: true,
              publicWebsiteUrl: true,
              publicSocialLinks: true,
              publicCoachingBrand: true,
              coachProfileSlug: true,
              coachPublicPage: true
            }
          },
          blocks: {
            select: {
              id: true,
              order: true,
              name: true,
              type: true,
              weeks: {
                select: {
                  id: true,
                  weekNumber: true,
                  focus: true,
                  workouts: {
                    select: {
                      id: true,
                      title: true,
                      type: true,
                      dayIndex: true,
                      durationSec: true,
                      tss: true
                    },
                    orderBy: [{ dayIndex: 'asc' }, { date: 'asc' }]
                  }
                },
                orderBy: { weekNumber: 'asc' }
              }
            }
          },
          sampleWeeks: {
            select: {
              weekId: true
            }
          }
        },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }]
      }
    }
  })

  if (!profileUser) {
    throw createError({ statusCode: 404, message: 'User not found.' })
  }

  const profile = resolveCoachPublicProfile(profileUser)

  return {
    profile,
    availablePlans: profileUser.trainingPlans.map((plan) => buildFeaturedPublicPlanPreview(plan))
  }
})
