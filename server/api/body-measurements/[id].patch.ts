import { z } from 'zod'
import { requireAuth } from '../../utils/auth-guard'
import { prisma } from '../../utils/db'
import { bodyMeasurementRepository } from '../../utils/repositories/bodyMeasurementRepository'
import { bodyMeasurementService } from '../../utils/services/bodyMeasurementService'

const schema = z.object({
  recordedAt: z.string().optional(),
  value: z.number().optional(),
  unit: z.string().optional(),
  displayName: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  isDeleted: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['profile:write'])
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Measurement id is required'
    })
  }

  const body = await readValidatedBody(event, (value) => schema.parse(value))
  const existing = await bodyMeasurementRepository.getByIdForUser(id, user.id)

  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Measurement not found'
    })
  }

  const updateData: Record<string, unknown> = {}

  if (body.recordedAt) {
    const recordedAt = new Date(body.recordedAt)
    if (Number.isNaN(recordedAt.getTime())) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid recordedAt'
      })
    }
    updateData.recordedAt = recordedAt
  }

  if (body.value !== undefined || body.unit !== undefined) {
    const normalized = bodyMeasurementService.normalizeMetricUnit(
      body.value ?? existing.value,
      body.unit ?? existing.unit
    )
    updateData.value = normalized.value
    updateData.unit = normalized.unit
  }

  if (body.displayName !== undefined) updateData.displayName = body.displayName
  if (body.notes !== undefined) updateData.notes = body.notes
  if (body.isDeleted !== undefined) updateData.isDeleted = body.isDeleted

  const entry = await prisma.bodyMeasurementEntry.update({
    where: { id },
    data: updateData
  })

  return {
    success: true,
    entry
  }
})
