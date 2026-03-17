import { getServerSession } from '../../../utils/session'
import { userMemoryService } from '../../../utils/services/userMemoryService'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = (session.user as any).id
  const scope = getQuery(event).scope

  const memories = await userMemoryService.listMemories({
    userId,
    scope: scope === 'GLOBAL' || scope === 'ROOM' ? scope : undefined
  })

  return {
    memories,
    grouped: {
      global: memories.filter((memory) => memory.scope === 'GLOBAL'),
      room: memories.filter((memory) => memory.scope === 'ROOM')
    }
  }
})
