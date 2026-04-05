import { publicPlansQuerySchema } from '../../../utils/public-plans'
import { buildPublicPlanSummary } from '../../../utils/public-plan-response'

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, publicPlansQuerySchema.parse)

  const where: any = {
    visibility: 'PUBLIC',
    OR: [{ accessState: 'FREE' }, { accessState: 'RESTRICTED' }]
  }

  if (query.sport) where.primarySport = query.sport
  if (query.subtype) where.sportSubtype = query.subtype
  if (query.skillLevel) where.skillLevel = query.skillLevel
  if (query.language) where.planLanguage = query.language
  if (query.daysPerWeek) where.daysPerWeek = query.daysPerWeek
  if (query.weeklyVolumeBand) where.weeklyVolumeBand = query.weeklyVolumeBand
  if (query.accessState) where.accessState = query.accessState
  if (query.q) {
    where.AND = [
      {
        OR: [
          { name: { contains: query.q, mode: 'insensitive' } },
          { publicHeadline: { contains: query.q, mode: 'insensitive' } },
          { publicDescription: { contains: query.q, mode: 'insensitive' } },
          { goalLabel: { contains: query.q, mode: 'insensitive' } }
        ]
      }
    ]
  }

  const plans = await prisma.trainingPlan.findMany({
    where,
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
          coachProfileEnabled: true,
          coachProfileSlug: true,
          coachPublicPage: true
        }
      },
      blocks: {
        select: {
          id: true,
          weeks: {
            select: { id: true }
          }
        }
      }
    },
    orderBy:
      query.sort === 'newest'
        ? { createdAt: 'desc' }
        : query.sort === 'shortest'
          ? { createdAt: 'desc' }
          : query.sort === 'longest'
            ? { createdAt: 'desc' }
            : query.sort === 'easiest'
              ? { difficulty: 'asc' }
              : query.sort === 'hardest'
                ? { difficulty: 'desc' }
                : [{ isFeatured: 'desc' }, { createdAt: 'desc' }]
  })

  const summaries = plans
    .map((plan) => buildPublicPlanSummary(plan))
    .filter((plan) => (query.lengthWeeks ? plan.lengthWeeks === query.lengthWeeks : true))
    .sort((a, b) => {
      if (query.sort === 'shortest') return a.lengthWeeks - b.lengthWeeks
      if (query.sort === 'longest') return b.lengthWeeks - a.lengthWeeks
      return 0
    })

  return { plans: summaries }
})
