import { z } from 'zod'
import { requireAuth } from '../../../utils/auth-guard'
import { prisma } from '../../../utils/db'

const bodySchema = z.object({
  timestamp: z.string().datetime(),
  eventType: z.enum(['SYMPTOM', 'WELLNESS_CHECK', 'RECOVERY_NOTE']),
  category: z.enum([
    'GI_DISTRESS',
    'MUSCLE_PAIN',
    'FATIGUE',
    'SLEEP',
    'MOOD',
    'CRAMPING',
    'DIZZINESS',
    'HUNGER'
  ]),
  severity: z.number().int().min(1).max(10),
  description: z.string().trim().max(500).nullable().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['health:write'])
  const body = bodySchema.parse(await readBody(event))
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing journey event id' })
  }

  const existing = await prisma.athleteJourneyEvent.findUnique({
    where: { id }
  })

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Journey event not found' })
  }

  if (existing.userId !== user.id) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  return prisma.athleteJourneyEvent.update({
    where: { id },
    data: {
      timestamp: new Date(body.timestamp),
      eventType: body.eventType,
      category: body.category,
      severity: body.severity,
      description: body.description || null
    }
  })
})
