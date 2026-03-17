import { getServerSession } from '../../../utils/session'
import { userMemoryService } from '../../../utils/services/userMemoryService'

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

  const result = await userMemoryService.forgetByContent({
    userId,
    content,
    roomId: typeof body?.roomId === 'string' ? body.roomId : null
  })

  return {
    success: result.status === 'archived',
    status: result.status,
    matches: result.matches
  }
})
