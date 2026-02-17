import { requireAuth } from '../../utils/auth-guard'
import { z } from 'zod'
import { sportSettingsRepository } from '../../utils/repositories/sportSettingsRepository'
import { profileUpdateSchema } from '../../utils/schemas/profile'
import { athleteMetricsService } from '../../utils/athleteMetricsService'

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
              country: { type: 'string' }
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
    // 1. Update Metrics via Service (Weight, FTP, LTHR, MaxHR)
    // This also handles goal syncing and zone recalculation
    const updatedUser = await athleteMetricsService.updateMetrics(userId, {
      ftp: data.ftp,
      weight: data.weight,
      maxHr: data.maxHr,
      lthr: data.lthr
    })

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

      await prisma.user.update({
        where: { id: userId },
        data: updatePayload
      })
    }

    // 3. Update Sport Settings via Repository (if explicitly provided)
    let updatedSettings = []
    if (sportSettings) {
      updatedSettings = await sportSettingsRepository.upsertSettings(userId, sportSettings)
    } else {
      // Fetch latest settings (including those updated by athleteMetricsService)
      updatedSettings = await sportSettingsRepository.getByUserId(userId)
    }

    // Re-fetch user to return full updated object
    const finalUser = await prisma.user.findUnique({
      where: { id: userId }
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
