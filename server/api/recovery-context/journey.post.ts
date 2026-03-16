import { z } from 'zod'
import { requireAuth } from '../../utils/auth-guard'
import { journeyService } from '../../utils/services/journeyService'

const bodySchema = z.object({
  timestamp: z.string().datetime(),
  eventType: z.enum(['SYMPTOM', 'WELLNESS_CHECK', 'RECOVERY_NOTE']).default('SYMPTOM'),
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
  description: z.string().trim().max(500).optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['health:write'])
  const body = bodySchema.parse(await readBody(event))

  const result = await journeyService.recordEvent({
    userId: user.id,
    timestamp: new Date(body.timestamp),
    eventType: body.eventType,
    category: body.category,
    severity: body.severity,
    description: body.description
  })

  return result.event
})
