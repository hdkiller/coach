import { getServerSession } from '../../../../utils/session'
import { userMemoryService } from '../../../../utils/services/userMemoryService'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = (session.user as any).id
  const roomId = getRouterParam(event, 'id')

  if (!roomId) {
    throw createError({ statusCode: 400, message: 'Room ID required' })
  }

  return await userMemoryService.getRoomMemoryState(userId, roomId)
})
