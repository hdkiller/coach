import { z } from 'zod'
import { prisma } from '../../utils/db'

const updateSchema = z.object({
  bmr: z.number().min(500).max(5000),
  activityLevel: z.enum([
    'SEDENTARY',
    'LIGHTLY_ACTIVE',
    'MODERATELY_ACTIVE',
    'VERY_ACTIVE',
    'EXTRA_ACTIVE'
  ]),
  currentCarbMax: z.number().min(0).max(150),
  ultimateCarbGoal: z.number().min(0).max(150),
  sweatRate: z.number().min(0).max(5).optional(),
  sodiumTarget: z.number().min(0).max(2000).optional(),
  preWorkoutWindow: z.number().min(0).max(240).optional(),
  postWorkoutWindow: z.number().min(0).max(240).optional(),
  carbsPerHourLow: z.number().min(0).max(120).optional(),
  carbsPerHourMedium: z.number().min(0).max(120).optional(),
  carbsPerHourHigh: z.number().min(0).max(150).optional()
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userId = session.user.id

  const body = await readBody(event)
  const result = updateSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid input',
      data: result.error.errors
    })
  }

  const { data } = result

  // Validation: Current max shouldn't exceed ultimate goal (soft check, or enforce?)
  // Let's enforce it for consistency, or just update ultimate if current > ultimate?
  // For now, just save what user sends.

  const settings = await prisma.userNutritionSettings.upsert({
    where: { userId },
    create: {
      userId,
      ...data
    },
    update: {
      ...data
    }
  })

  return {
    settings
  }
})
