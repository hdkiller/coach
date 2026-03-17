import type { UserMemoryCategory, UserMemoryScope } from '@prisma/client'
import { getServerSession } from '../../../utils/session'
import { chatService } from '../../../utils/services/chatService'
import { buildMemoryCandidate, userMemoryService } from '../../../utils/services/userMemoryService'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = (session.user as any).id
  const body = await readBody(event)
  const content = typeof body?.content === 'string' ? body.content.trim() : ''

  if (!content) {
    throw createError({ statusCode: 400, message: 'Content is required.' })
  }

  const scope: UserMemoryScope = body?.scope === 'ROOM' ? 'ROOM' : 'GLOBAL'
  const roomId = typeof body?.roomId === 'string' ? body.roomId : null

  if (scope === 'ROOM') {
    if (!roomId) {
      throw createError({ statusCode: 400, message: 'Room ID is required for room memories.' })
    }
    await chatService.validateRoomAccess(userId, roomId)
  }

  const result = await userMemoryService.saveMemory(
    userId,
    buildMemoryCandidate({
      content,
      source: 'USER_EXPLICIT',
      scope,
      roomId,
      category: body?.category as UserMemoryCategory | undefined,
      confidence: typeof body?.confidence === 'number' ? body.confidence : 1,
      sensitive: typeof body?.sensitive === 'boolean' ? body.sensitive : undefined,
      metadata: {
        createdFrom: body?.createdFrom || 'chat'
      }
    }),
    { touchConfirmedAt: true }
  )

  return {
    success: true,
    created: result.created,
    updated: result.updated,
    memory: result.memory
  }
})
