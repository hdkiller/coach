import { getServerSession } from '../../utils/session'
import { eventRepository } from '../../utils/repositories/eventRepository'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const id = getRouterParam(event, 'id')
  const userId = (session.user as any).id
  
  try {
    await eventRepository.delete(id, userId)
    return { success: true }
  } catch (error: any) {
    if (error.message.includes('Not authorized')) {
      throw createError({ statusCode: 403, message: error.message })
    }
    throw createError({ statusCode: 500, message: error.message })
  }
})
