import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'
import { recommendationRepository } from '../../utils/repositories/recommendationRepository'
import { athleteMetricsService } from '../../utils/athleteMetricsService'
import { z } from 'zod'

const updateSchema = z.object({
  status: z.enum(['ACTIVE', 'COMPLETED', 'DISMISSED']).optional(),
  isPinned: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.email) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const result = updateSchema.safeParse(body)

  if (!result.success) {
    throw createError({ statusCode: 400, message: 'Invalid body' })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) throw createError({ statusCode: 404, message: 'User not found' })

  // Verify ownership
  const recommendation = await recommendationRepository.findById(id!, user.id)

  if (!recommendation) {
    throw createError({ statusCode: 404, message: 'Recommendation not found' })
  }

  const data: any = {}
  if (result.data.status) {
    data.status = result.data.status
    if (result.data.status === 'COMPLETED') {
      await athleteMetricsService.applyThresholdRecommendation(recommendation)
      data.completedAt = new Date()
    }
  }
  if (result.data.isPinned !== undefined) {
    data.isPinned = result.data.isPinned
  }

  const updated = await recommendationRepository.update(id!, user.id, data)

  return updated
})
