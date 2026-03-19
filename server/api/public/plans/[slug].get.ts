import { buildPublicPlanDetail } from '../../../utils/public-plan-response'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, message: 'Plan slug is required.' })
  }

  const plan = await prisma.trainingPlan.findFirst({
    where: {
      slug,
      visibility: 'PUBLIC',
      OR: [{ accessState: 'FREE' }, { accessState: 'RESTRICTED' }]
    },
    include: {
      goal: {
        select: {
          title: true
        }
      },
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
        select: {
          weekId: true
        }
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
    throw createError({ statusCode: 404, message: 'Public plan not found.' })
  }

  return {
    plan: buildPublicPlanDetail(plan, 'preview')
  }
})
