import { getServerSession } from '#auth'
import { prisma } from '../../../utils/db'
import {
  buildFeaturedPublicPlanPreview,
  buildPublicPlanSummary
} from '../../../utils/public-plan-response'
import { resolveCoachPublicProfile } from '../../../utils/public-presence'

function getVisibleSections(profile: any) {
  return [...(profile.sections || [])]
    .filter((section: any) => section.enabled)
    .sort((a: any, b: any) => a.order - b.order)
}

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, message: 'Coach slug is required.' })
  }

  const session = await getServerSession(event)

  const user = await prisma.user.findFirst({
    where: {
      AND: [
        { OR: [{ coachProfileSlug: slug }, { publicAuthorSlug: slug }] },
        { OR: [{ coachProfileEnabled: true }, { publicAuthorSlug: { not: null } }] }
      ]
    },
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

  if (!user) {
    throw createError({ statusCode: 404, message: 'Coach profile not found.' })
  }

  const profile = resolveCoachPublicProfile(user)
  const plans = user.trainingPlans.map((plan) => buildPublicPlanSummary(plan))
  const featuredPlanMeta = [...(profile.settings.featuredPlanMeta || [])].sort(
    (a, b) => a.order - b.order
  )
  const featuredPlanMetaMap = new Map(featuredPlanMeta.map((item) => [item.planId, item]))
  const featuredPlanIds = new Set(featuredPlanMeta.map((item) => item.planId))
  const featuredPlans = user.trainingPlans
    .filter((plan) => featuredPlanIds.has(plan.id) || plan.isFeatured)
    .map((plan) =>
      buildFeaturedPublicPlanPreview(plan, {
        highlightWeekId: featuredPlanMetaMap.get(plan.id)?.highlightWeekId || null,
        coachNote: featuredPlanMetaMap.get(plan.id)?.coachNote || null,
        order: featuredPlanMetaMap.get(plan.id)?.order ?? Number.MAX_SAFE_INTEGER
      })
    )
    .sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name))
  const remainingPlans = plans.filter(
    (plan) => !featuredPlans.some((featured) => featured.id === plan.id)
  )

  return {
    ownerId: user.id,
    author: {
      image: user.image,
      name: user.name
    },
    profile: {
      ...profile,
      sections: getVisibleSections(profile)
    },
    plans,
    featuredPlans,
    remainingPlans,
    viewer: {
      isOwner: (session?.user as any)?.id === user.id
    }
  }
})
