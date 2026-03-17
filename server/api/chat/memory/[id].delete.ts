import { getServerSession } from '../../../utils/session'
import { userMemoryService } from '../../../utils/services/userMemoryService'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = (session.user as any).id
  const memoryId = getRouterParam(event, 'id')

  if (!memoryId) {
    throw createError({ statusCode: 400, message: 'Memory ID is required.' })
  }

  const memory = await userMemoryService.softDeleteMemory(userId, memoryId)

  return {
    success: true,
    memory
  }
})
