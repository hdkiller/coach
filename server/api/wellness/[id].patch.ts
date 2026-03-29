import { z } from 'zod'
import { requireAuth } from '../../utils/auth-guard'
import { prisma } from '../../utils/db'
import { toPrismaInputJsonValue } from '../../utils/prisma-json'
import { normalizeWellnessFields } from '../../utils/wellnessNormalization'

const updateWellnessSchema = z.object({
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
  soreness: z.number().int().min(1).max(10).nullable().optional(),
  fatigue: z.number().int().min(1).max(10).nullable().optional(),
  stress: z.number().int().min(1).max(10).nullable().optional(),
  mood: z.number().int().min(1).max(10).nullable().optional(),
  motivation: z.number().int().min(1).max(10).nullable().optional(),
  weight: z.number().nullable().optional(),
  spO2: z.number().nullable().optional(),
  ctl: z.number().nullable().optional(),
  atl: z.number().nullable().optional(),
  comments: z.string().max(1000).nullable().optional(),
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
  tags: z.string().nullable().optional(),
  customMetrics: z.record(z.string(), z.any()).optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const result = updateWellnessSchema.safeParse(normalizeWellnessFields(body))
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid wellness data'
    })
  }

  // Ensure record exists and belongs to user
  const existing = await prisma.wellness.findFirst({
    where: {
      id,
      userId: user.id
    }
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Wellness record not found'
    })
  }

  return await prisma.wellness.update({
    where: { id },
    data: {
      ...result.data,
      ...(result.data.customMetrics !== undefined
        ? { customMetrics: toPrismaInputJsonValue(result.data.customMetrics) }
        : {})
    }
  })
})
