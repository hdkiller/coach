import { buildPublicPlanSummary } from '../../../utils/public-plan-response'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, message: 'Author slug is required.' })
  }

  const author = await prisma.user.findFirst({
    where: {
      publicAuthorSlug: slug
    },
    select: {
      id: true,
      name: true,
      image: true,
      publicAuthorSlug: true,
      publicDisplayName: true,
      publicBio: true,
      publicLocation: true,
      publicWebsiteUrl: true,
      publicSocialLinks: true,
      publicCoachingBrand: true,
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
              publicCoachingBrand: true
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
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }]
      }
    }
  })

  if (!author) {
    throw createError({ statusCode: 404, message: 'Public author not found.' })
  }

  return {
    author: {
      slug: author.publicAuthorSlug,
      displayName: author.publicDisplayName || author.name || 'Coach Wattz Author',
      bio: author.publicBio,
      location: author.publicLocation,
      websiteUrl: author.publicWebsiteUrl,
      socialLinks: Array.isArray(author.publicSocialLinks) ? author.publicSocialLinks : [],
      coachingBrand: author.publicCoachingBrand,
      image: author.image
    },
    plans: author.trainingPlans.map((plan) => buildPublicPlanSummary(plan))
  }
})
