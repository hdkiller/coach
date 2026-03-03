import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { requireAuth } from '../../utils/auth-guard'
import { prisma } from '../../utils/db'
import { bodyMeasurementService } from '../../utils/services/bodyMeasurementService'

const patchSchema = z.object({
  date: z.string().optional(),
  hrv: z.number().nullable().optional(),
  hrvSdnn: z.number().nullable().optional(),
  restingHr: z.number().int().nullable().optional(),
  avgSleepingHr: z.number().int().nullable().optional(),
  sleepSecs: z.number().int().nullable().optional(),
  sleepHours: z.number().nullable().optional(),
  sleepDeepSecs: z.number().int().nullable().optional(),
  sleepRemSecs: z.number().int().nullable().optional(),
  sleepLightSecs: z.number().int().nullable().optional(),
  sleepAwakeSecs: z.number().int().nullable().optional(),
  sleepScore: z.number().int().nullable().optional(),
  sleepQuality: z.number().int().nullable().optional(),
  readiness: z.number().int().nullable().optional(),
  recoveryScore: z.number().int().nullable().optional(),
  soreness: z.number().int().nullable().optional(),
  fatigue: z.number().int().nullable().optional(),
  stress: z.number().int().nullable().optional(),
  mood: z.number().int().nullable().optional(),
  motivation: z.number().int().nullable().optional(),
  weight: z.number().nullable().optional(),
  spO2: z.number().nullable().optional(),
  ctl: z.number().nullable().optional(),
  atl: z.number().nullable().optional(),
  comments: z.string().nullable().optional(),
  abdomen: z.number().nullable().optional(),
  bloodGlucose: z.number().nullable().optional(),
  bodyFat: z.number().nullable().optional(),
  diastolic: z.number().int().nullable().optional(),
  hydration: z.string().nullable().optional(),
  hydrationVolume: z.number().nullable().optional(),
  injury: z.string().nullable().optional(),
  lactate: z.number().nullable().optional(),
  menstrualPhase: z.string().nullable().optional(),
  respiration: z.number().nullable().optional(),
  skinTemp: z.number().nullable().optional(),
  restingCaloriesBurned: z.number().int().nullable().optional(),
  activeCaloriesBurned: z.number().int().nullable().optional(),
  totalCaloriesBurned: z.number().int().nullable().optional(),
  systolic: z.number().int().nullable().optional(),
  vo2max: z.number().nullable().optional(),
  tags: z.string().nullable().optional()
})

defineRouteMeta({
  openAPI: {
    tags: ['Wellness'],
    summary: 'Update wellness record',
    description:
      'Updates editable fields on a specific wellness record. Fields may be set to null to clear bad data.',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'wellnessId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Wellness record ID'
      }
    ],
    responses: {
      200: { description: 'Success' },
      400: { description: 'Invalid input' },
      401: { description: 'Unauthorized' },
      404: { description: 'Wellness record not found' },
      409: { description: 'Date conflict' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['health:write'])
  const wellnessId = getRouterParam(event, 'wellnessId') || getRouterParam(event, 'id')

  if (!wellnessId) {
    throw createError({
      statusCode: 400,
      message: 'Wellness ID is required'
    })
  }

  const body = await readValidatedBody(event, (b) => patchSchema.parse(b))

  const wellness = await prisma.wellness.findUnique({
    where: { id: wellnessId }
  })

  if (!wellness || wellness.userId !== user.id) {
    throw createError({
      statusCode: 404,
      message: 'Wellness record not found'
    })
  }

  const incomingData: Record<string, any> = {}

  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined && key !== 'date') {
      incomingData[key] = value
    }
  }

  if (body.date !== undefined) {
    const parsedDate = new Date(body.date)
    if (Number.isNaN(parsedDate.getTime())) {
      throw createError({
        statusCode: 400,
        message: 'Invalid date format'
      })
    }
    incomingData.date = new Date(
      Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate())
    )
  }

  const updateData: Record<string, any> = {}
  const changes: Record<string, { old: any; new: any }> = {}

  for (const [key, nextValue] of Object.entries(incomingData)) {
    const currentValue = (wellness as any)[key]

    const isSame =
      key === 'date'
        ? currentValue instanceof Date &&
          nextValue instanceof Date &&
          currentValue.toISOString().slice(0, 10) === nextValue.toISOString().slice(0, 10)
        : currentValue === nextValue

    if (!isSame) {
      updateData[key] = nextValue
      changes[key] = {
        old:
          key === 'date' && currentValue instanceof Date
            ? currentValue.toISOString()
            : currentValue,
        new: key === 'date' && nextValue instanceof Date ? nextValue.toISOString() : nextValue
      }
    }
  }

  const changedFields = Object.keys(changes)

  if (changedFields.length === 0) {
    return { success: true, wellness }
  }

  const existingHistory = Array.isArray(wellness.history) ? wellness.history : []
  const historyEntry = {
    timestamp: new Date().toISOString(),
    source: 'manual_edit',
    changedFields,
    changes
  }

  try {
    const updated = await prisma.wellness.update({
      where: { id: wellnessId },
      data: {
        ...updateData,
        lastSource: 'manual_edit',
        history: [...existingHistory, historyEntry]
      }
    })

    await bodyMeasurementService.recordWellnessMetrics(
      user.id,
      {
        id: updated.id,
        date: updated.date,
        weight: updated.weight,
        bodyFat: updated.bodyFat
      },
      'manual_edit'
    )

    return {
      success: true,
      wellness: updated
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes('userId') &&
      error.meta.target.includes('date')
    ) {
      throw createError({
        statusCode: 409,
        message: 'A wellness record already exists for that date.'
      })
    }

    console.error('Error updating wellness record:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update wellness record'
    })
  }
})
