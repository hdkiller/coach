import { requireAuth } from '../../utils/auth-guard'
import { dailyCheckinRepository } from '../../utils/repositories/dailyCheckinRepository'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['health:write'])
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing check-in id' })
  }

  const checkin = await dailyCheckinRepository.findById(id)

  if (!checkin) {
    throw createError({ statusCode: 404, message: 'Check-in not found' })
  }

  if (checkin.userId !== user.id) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  await dailyCheckinRepository.delete(id)

  return { success: true }
})
