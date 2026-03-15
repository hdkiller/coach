import { requireAuth } from '../../utils/auth-guard'
import { sportSettingsRepository } from '../../utils/repositories/sportSettingsRepository'
import { profileUpdateSchema } from '../../utils/schemas/profile'
import { athleteMetricsService } from '../../utils/athleteMetricsService'
import { LBS_TO_KG } from '../../utils/number'
import { bodyMeasurementService } from '../../utils/services/bodyMeasurementService'

defineRouteMeta({
  openAPI: {
    tags: ['Profile'],
    summary: 'Update Profile',
    description: 'Updates the authenticated user profile and metrics (Weight, FTP, MaxHR).',
    security: [{ bearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              weight: { type: 'number', description: 'Weight in kilograms' },
              ftp: { type: 'integer', description: 'Functional Threshold Power in Watts' },
              maxHr: { type: 'integer', description: 'Maximum Heart Rate in bpm' },
              lthr: { type: 'integer', description: 'Lactate Threshold Heart Rate in bpm' },
              dob: { type: 'string', format: 'date', description: 'Date of Birth (YYYY-MM-DD)' },
              sex: { type: 'string', enum: ['Male', 'Female', 'M', 'F'] },
              city: { type: 'string' },
              country: { type: 'string' },
              uiLanguage: { type: 'string' }
            }
          }
        }
      }
    },
    responses: {
      200: { description: 'Success' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' }
    }
  }
})

export default defineEventHandler(async (event) => {
  // Check auth and scope
  const user = await requireAuth(event, ['profile:write'])

  const body = await readBody(event)
  const result = profileUpdateSchema.safeParse(body)

  if (!result.success) {
    console.warn('[PATCH /api/profile] Validation failed:', {
      user: user.email,
      errors: result.error.issues,
      body: body
    })
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid input',
      data: result.error.issues
    })
  }

  const data = result.data
  const userId = user.id

  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        weight: true,
        height: true,
        weightUnits: true
      }
    })

    // 1. Convert weight to KG if provided in Pounds
    // Database is standardized to Kilograms
    let weightKg = data.weight
    if (weightKg !== undefined && weightKg !== null) {
      if (data.weightUnits === 'Pounds') {
        weightKg = weightKg * LBS_TO_KG
      } else if (!data.weightUnits) {
        // If units not provided in this patch, check current user units
        if (currentUser?.weightUnits === 'Pounds') {
          weightKg = weightKg * LBS_TO_KG
        }
      }
    }

    // 2. Update Metrics via Service (Weight, FTP, LTHR, MaxHR)
    // This also handles goal syncing and zone recalculation
    await athleteMetricsService.updateMetrics(
      userId,
      {
        ftp: data.ftp,
        weight: weightKg,
        maxHr: data.maxHr,
        lthr: data.lthr
      },
      { sportType: (data as any).sportType, weightUpdateSource: 'manual' }
    )

    // 2. Update remaining User fields
    const { sportSettings, hrZones, powerZones, ftp, weight, maxHr, lthr, ...otherData } = data

    if (Object.keys(otherData).length > 0) {
      // Normalize sex
      if (otherData.sex === 'M') otherData.sex = 'Male'
      if (otherData.sex === 'F') otherData.sex = 'Female'

      // Handle date conversion for DOB
      const updatePayload: any = { ...otherData }
      if (updatePayload.dob) {
        updatePayload.dob = new Date(updatePayload.dob)
      }

      // Explicitly include uiLanguage if provided
      if (data.uiLanguage !== undefined) {
        updatePayload.uiLanguage = data.uiLanguage
      }

      await prisma.user.update({
        where: { id: userId },
        data: updatePayload
      })
    }

    const measurementWrites: Promise<unknown>[] = []
    if (weightKg !== undefined && weightKg !== currentUser?.weight) {
      measurementWrites.push(
        bodyMeasurementService.recordProfileMetrics(userId, { weight: weightKg })
      )
    }
    if (data.height !== undefined && data.height !== currentUser?.height) {
      measurementWrites.push(
        bodyMeasurementService.recordProfileMetrics(userId, { height: data.height })
      )
    }
    if (measurementWrites.length > 0) {
      await Promise.all(measurementWrites)
    }

    // 3. Update Sport Settings via Repository (if explicitly provided)
    let updatedSettings = []
    if (sportSettings) {
      updatedSettings = await sportSettingsRepository.upsertSettings(userId, sportSettings)

      const resolvedMetrics = {
        ftp: sportSettings.some((setting: any) => setting.ftp !== undefined) ? 0 : undefined,
        lthr: sportSettings.some((setting: any) => setting.lthr !== undefined) ? 0 : undefined,
        maxHr: sportSettings.some((setting: any) => setting.maxHr !== undefined) ? 0 : undefined,
        thresholdPace: sportSettings.some((setting: any) => setting.thresholdPace !== undefined)
          ? 0
          : undefined
      }

      await athleteMetricsService.resolveThresholdRecommendations(userId, resolvedMetrics)
    } else {
      // Fetch latest settings (including those updated by athleteMetricsService)
      updatedSettings = await sportSettingsRepository.getByUserId(userId)
    }

    // Re-fetch user to return full updated object
    const finalUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        nickname: true,
        email: true,
        ftp: true,
        maxHr: true,
        lthr: true,
        weight: true,
        weightUnits: true,
        weightSourceMode: true,
        dob: true,
        language: true,
        uiLanguage: true,
        height: true,
        heightUnits: true,
        distanceUnits: true,
        temperatureUnits: true,
        restingHr: true,
        visibility: true,
        sex: true,
        city: true,
        state: true,
        country: true,
        timezone: true,
        nutritionTrackingEnabled: true
      }
    })

    // Helper to format date as YYYY-MM-DD
    const formatDate = (date: Date | null) => {
      if (!date) return null
      return date.toISOString().split('T')[0]
    }

    return {
      success: true,
      profile: {
        ...finalUser,
        dob: formatDate(finalUser?.dob || null),
        // Return updated sport settings
        sportSettings: updatedSettings
      }
    }
  } catch (error) {
    console.error('[PATCH /api/profile] Update failed:', {
      user: user.email,
      error: error,
      payload: data
    })
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update profile'
    })
  }
})
