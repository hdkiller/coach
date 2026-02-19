import { getServerSession } from '../../utils/session'
import { eventRepository } from '../../utils/repositories/eventRepository'
import { syncEventToIntervals } from '../../utils/intervals-sync'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing event ID' })

  const userId = (session.user as any).id

  try {
    // 1. Fetch event before deletion to get externalId
    const existingEvent = await eventRepository.getById(id, userId)

    if (existingEvent && existingEvent.externalId && existingEvent.source === 'intervals') {
      // 2. Attempt sync deletion
      await syncEventToIntervals('DELETE', existingEvent, userId)
    }

    // 3. Delete locally
    await eventRepository.delete(id, userId)
    return { success: true }
  } catch (error: any) {
    if (error.message.includes('Not authorized')) {
      throw createError({ statusCode: 403, message: error.message })
    }
    throw createError({ statusCode: 500, message: error.message })
  }
})
