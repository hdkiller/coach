import { z } from 'zod'
import { requireAuth } from '../../utils/auth-guard'
import { bodyMeasurementService } from '../../utils/services/bodyMeasurementService'

const schema = z.object({
  recordedAt: z.string(),
  metricKey: z.string().min(1),
  displayName: z.string().nullable().optional(),
  value: z.number(),
  unit: z.string().min(1),
  notes: z.string().nullable().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['profile:write'])
  const body = await readValidatedBody(event, (value) => schema.parse(value))

  const recordedAt = new Date(body.recordedAt)
  if (Number.isNaN(recordedAt.getTime())) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid recordedAt'
    })
  }

  const entry = await bodyMeasurementService.recordEntry({
    userId: user.id,
    recordedAt,
    metricKey: body.metricKey,
    displayName: body.displayName ?? null,
    value: body.value,
    unit: body.unit,
    notes: body.notes ?? null,
    source: 'manual_measurement'
  })

  return {
    success: true,
    entry
  }
})
