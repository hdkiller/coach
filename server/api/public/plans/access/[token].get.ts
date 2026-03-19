import { buildPublicPlanDetail } from '../../../../utils/public-plan-response'
import { resolveShareTokenAccessMode } from '../../../../utils/public-plans'

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')

  if (!token) {
    throw createError({ statusCode: 400, message: 'Share token is required.' })
  }

  const shareToken = await prisma.shareToken.findUnique({
    where: { token },
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
          publicCoachingBrand: true
        }
      }
    }
  })

  if (!shareToken || shareToken.resourceType !== 'TRAINING_PLAN') {
    throw createError({ statusCode: 404, message: 'Plan share link not found.' })
  }

  if (shareToken.expiresAt && new Date() > shareToken.expiresAt) {
    throw createError({ statusCode: 410, message: 'Share link has expired.' })
  }

  const plan = await prisma.trainingPlan.findFirst({
    where: {
      id: shareToken.resourceId,
      userId: shareToken.userId
    },
    include: {
      goal: { select: { title: true } },
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
          publicCoachingBrand: true
        }
      },
      sampleWeeks: {
        select: { weekId: true }
      },
      blocks: {
        orderBy: { order: 'asc' },
        include: {
          weeks: {
            orderBy: { weekNumber: 'asc' },
            include: {
              workouts: {
                orderBy: [{ dayIndex: 'asc' }, { date: 'asc' }]
              }
            }
          }
        }
      }
    }
  })

  if (!plan) {
    throw createError({ statusCode: 404, message: 'Shared plan no longer exists.' })
  }

  return {
    plan: buildPublicPlanDetail(
      {
        ...plan,
        user: shareToken.user || plan.user
      },
      resolveShareTokenAccessMode(shareToken.accessMode) === 'FULL' ? 'full' : 'preview'
    )
  }
})
