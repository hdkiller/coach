import { z } from 'zod'
import { requireAuth } from '../../utils/auth-guard'
import { prisma } from '../../utils/db'
import { toPrismaInputJsonValue } from '../../utils/prisma-json'

const updateWellnessSchema = z.object({
  mood: z.number().min(1).max(10).optional(),
  stress: z.number().min(1).max(10).optional(),
  fatigue: z.number().min(1).max(10).optional(),
  soreness: z.number().min(1).max(10).optional(),
  motivation: z.number().min(1).max(10).optional(),
  weight: z.number().optional(),
  comments: z.string().max(1000).optional(),
  customMetrics: z.record(z.string(), z.any()).optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const result = updateWellnessSchema.safeParse(body)
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
