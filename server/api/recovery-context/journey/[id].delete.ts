import { requireAuth } from '../../../utils/auth-guard'
import { prisma } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['health:write'])
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

  await prisma.athleteJourneyEvent.delete({
    where: { id }
  })

  return { success: true }
})
