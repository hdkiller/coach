import { requireAuth } from '../../../utils/auth-guard'
import { trainingWeekRepository } from '../../../utils/repositories/trainingWeekRepository'
import { z } from 'zod/v3'

const updateWeekSchema = z.object({
  focusKey: z.string().optional(),
  focusLabel: z.string().optional(),
  volumeTargetMinutes: z.number().int().min(0).optional(),
  tssTarget: z.number().int().min(0).optional(),
  isRecovery: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['plan:write'])

  const weekId = getRouterParam(event, 'id')
  const body = await readBody(event)

  const validation = updateWeekSchema.safeParse(body)
  if (!validation.success) {
    throw createError({ statusCode: 400, message: validation.error.message })
  }

  // Verify ownership
  const week = await trainingWeekRepository.getById(weekId!, {
    include: {
      block: {
        include: {
          plan: { select: { userId: true } }
        }
      }
    }
  })

  if (!week || (week.block as any).plan.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Week not found' })
  }

  // Update the week
  const updatedWeek = await trainingWeekRepository.update(weekId!, validation.data)

  return {
    success: true,
    week: updatedWeek
  }
})
