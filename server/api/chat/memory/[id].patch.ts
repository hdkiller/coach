import type { UserMemoryCategory, UserMemoryScope, UserMemoryStatus } from '@prisma/client'
import { getServerSession } from '../../../utils/session'
import { chatService } from '../../../utils/services/chatService'
import { userMemoryService } from '../../../utils/services/userMemoryService'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = (session.user as any).id
  const memoryId = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!memoryId) {
    throw createError({ statusCode: 400, message: 'Memory ID is required.' })
  }

  const scope: UserMemoryScope | undefined =
    body?.scope === 'GLOBAL' || body?.scope === 'ROOM' ? body.scope : undefined
  const roomId = typeof body?.roomId === 'string' ? body.roomId : undefined

  if (scope === 'ROOM' && roomId) {
    await chatService.validateRoomAccess(userId, roomId)
  }

  const memory = await userMemoryService.updateMemory(userId, memoryId, {
    ...(typeof body?.content === 'string' ? { content: body.content } : {}),
    ...(scope ? { scope } : {}),
    ...(roomId !== undefined ? { roomId } : {}),
    ...(body?.category ? { category: body.category as UserMemoryCategory } : {}),
    ...(typeof body?.confidence === 'number' ? { confidence: body.confidence } : {}),
    ...(body?.source ? { source: body.source } : {}),
    ...(body?.status ? { status: body.status as UserMemoryStatus } : {}),
    ...(typeof body?.pinned === 'boolean' ? { pinned: body.pinned } : {}),
    ...(typeof body?.sensitive === 'boolean' ? { sensitive: body.sensitive } : {})
  })

  return {
    success: true,
    memory
  }
})
