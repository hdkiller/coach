import { getServerSession } from '../../../utils/session'
import { extractMemoryCandidatesFromConversation } from '../../../utils/chat/memory-extraction'
import { chatService } from '../../../utils/services/chatService'
import { userMemoryService } from '../../../utils/services/userMemoryService'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = (session.user as any).id
  const body = await readBody(event)
  const roomId = typeof body?.roomId === 'string' ? body.roomId : null
  const text = typeof body?.text === 'string' ? body.text : ''

  if (roomId) {
    await chatService.validateRoomAccess(userId, roomId)
  }

  const existingMemories = await userMemoryService.listMemories({
    userId,
    ...(roomId ? {} : { scope: 'GLOBAL' })
  })

  const result = await extractMemoryCandidatesFromConversation({
    userId,
    roomId,
    messages: [{ role: 'user', content: text }],
    existingMemories: existingMemories.map((memory) => ({
      scope: memory.scope,
      content: memory.content
    })),
    operation: 'memory-preview',
    entityType: 'ChatRoom',
    entityId: roomId
  })

  return {
    shouldExtract: result.shouldExtract,
    candidates: result.candidates
  }
})
