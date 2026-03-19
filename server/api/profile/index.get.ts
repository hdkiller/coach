import { getServerSession } from '../../utils/session'
import { sportSettingsRepository } from '../../utils/repositories/sportSettingsRepository'
import { bodyMetricResolver } from '../../utils/services/bodyMetricResolver'

defineRouteMeta({
  openAPI: {
    tags: ['Profile'],
    summary: 'Get user profile',
    description: 'Returns the full profile and settings for the authenticated user.',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                connected: { type: 'boolean' },
                profile: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', nullable: true },
                    nickname: { type: 'string', nullable: true },
                    email: { type: 'string' },
                    ftp: { type: 'integer', nullable: true },
                    maxHr: { type: 'integer', nullable: true },
                    weight: { type: 'number', nullable: true },
                    language: { type: 'string' },
                    uiLanguage: { type: 'string' },
                    distanceUnits: { type: 'string' },
                    city: { type: 'string', nullable: true },
                    country: { type: 'string', nullable: true }
                  }
                }
              }
            }
          }
        }
      },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session?.user?.email) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  try {
    // Get user by email with all profile fields
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        nickname: true,
        email: true,
        ftp: true,
        maxHr: true,
        lthr: true,
        weight: true,
        dob: true,
        language: true,
        uiLanguage: true,
        weightUnits: true,
        weightSourceMode: true,
        height: true,
        heightUnits: true,
        distanceUnits: true,
        temperatureUnits: true,
        restingHr: true,
        form: true,
        visibility: true,
        sex: true,
        city: true,
        state: true,
        country: true,
        timezone: true,
        publicAuthorSlug: true,
        publicDisplayName: true,
        publicBio: true,
        publicLocation: true,
        publicWebsiteUrl: true,
        publicSocialLinks: true,
        publicCoachingBrand: true,
        nutritionTrackingEnabled: true,
        accounts: {
          select: {
            provider: true,
            providerAccountId: true,
            createdAt: true
          }
        },
        integrations: {
          select: {
            provider: true,
            externalUserId: true,
            syncStatus: true
          }
        },
        personalBests: {
          include: {
            workout: {
              select: {
                id: true,
                title: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    // Get Sport Settings via Repository (handles Default lazy creation)
    const sportSettings = await sportSettingsRepository.getByUserId(user.id)
    const defaultProfile = sportSettings.find((s: any) => s.isDefault)
    const effectiveWeight = await bodyMetricResolver.resolveEffectiveWeight(user.id, {
      weight: user.weight,
      weightSourceMode: (user as any).weightSourceMode,
      weightUnits: user.weightUnits
    })

    // Helper to format date as YYYY-MM-DD
    const formatDate = (date: Date | null) => {
      if (!date) return null
      return date.toISOString().split('T')[0]
    }

    return {
      connected: true, // Assuming if we have user data we are "connected" to the app
      profile: {
        id: user.id,
        name: user.name,
        nickname: user.nickname,
        email: user.email,
        language: user.language || 'English',
        uiLanguage: user.uiLanguage || 'en',
        weight: user.weight,
        weightUnits: user.weightUnits || 'Kilograms',
        weightSourceMode: (user as any).weightSourceMode || 'AUTO',
        effectiveWeight: effectiveWeight.value,
        effectiveWeightSource: effectiveWeight.source,
        height: user.height,
        heightUnits: user.heightUnits || 'cm',
        distanceUnits: user.distanceUnits || 'Kilometers',
        temperatureUnits: user.temperatureUnits || 'Celsius',
        restingHr: defaultProfile?.restingHr || user.restingHr,
        maxHr: defaultProfile?.maxHr || user.maxHr,
        lthr: defaultProfile?.lthr || user.lthr,
        ftp: defaultProfile?.ftp || user.ftp,
        visibility: user.visibility || 'Private',
        sex: user.sex,
        dob: formatDate(user.dob),
        city: user.city,
        state: user.state,
        country: user.country,
        timezone: user.timezone,
        publicAuthorSlug: user.publicAuthorSlug,
        publicDisplayName: user.publicDisplayName,
        publicBio: user.publicBio,
        publicLocation: user.publicLocation,
        publicWebsiteUrl: user.publicWebsiteUrl,
        publicSocialLinks: user.publicSocialLinks,
        publicCoachingBrand: user.publicCoachingBrand,
        nutritionTrackingEnabled: user.nutritionTrackingEnabled,
        accounts: user.accounts,
        integrations: user.integrations,
        sportSettings: sportSettings,
        personalBests: user.personalBests
      }
    }
  } catch (error) {
    console.error('Error fetching profile:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch profile'
    })
  }
})
