import { getServerSession } from '#auth'
import { prisma } from '../../../../utils/db'
import { buildCoachStartExperience } from '../../../../utils/public-start'
import { resolveCoachPublicProfile } from '../../../../utils/public-presence'

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
      email: true,
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

  if (!user) {
    throw createError({ statusCode: 404, message: 'Coach profile not found.' })
  }

  const viewerId = (session?.user as any)?.id || null
  const activeRelationships = viewerId
    ? await (prisma as any).coachingRelationship.findMany({
        where: {
          athleteId: viewerId,
          status: 'ACTIVE'
        },
        include: {
          coach: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })
    : []

  const profile = resolveCoachPublicProfile(user)
  const viewerIsOwner = viewerId === user.id

  if (profile.startPage?.enabled === false && !viewerIsOwner) {
    throw createError({ statusCode: 404, message: 'Coach start page not found.' })
  }

  return {
    ownerId: user.id,
    viewer: {
      isOwner: viewerIsOwner,
      isAuthenticated: Boolean(viewerId),
      hasActiveCoach: activeRelationships.length > 0,
      activeCoachNames: activeRelationships.map((rel: any) => rel.coach.name || rel.coach.email)
    },
    start: buildCoachStartExperience({
      user,
      profile,
      viewer: {
        isOwner: viewerIsOwner,
        isAuthenticated: Boolean(viewerId),
        hasActiveCoach: activeRelationships.length > 0,
        activeCoachNames: activeRelationships.map((rel: any) => rel.coach.name || rel.coach.email)
      }
    })
  }
})
