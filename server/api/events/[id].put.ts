import { z } from 'zod'
import { getServerSession } from '../../utils/session'
import { eventRepository } from '../../utils/repositories/eventRepository'
import { syncEventToIntervals } from '../../utils/intervals-sync'
import { prisma } from '../../utils/db'

const eventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  date: z.string(),
  startTime: z.string().optional(),
  type: z.string().optional(),
  subType: z.string().optional(),
  priority: z.enum(['A', 'B', 'C']).or(z.literal('')).nullable().optional(),
  isVirtual: z.boolean().default(false),
  isPublic: z.boolean().default(false),
  country: z.string().optional(),
  city: z.string().optional(),
  location: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  distance: z.number().nullable().optional(),
  elevation: z.number().nullable().optional(),
  expectedDuration: z.number().nullable().optional(),
  terrain: z.string().optional(),
  goalIds: z.array(z.string()).optional()
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing event ID' })

  const body = await readBody(event)
  const result = eventSchema.safeParse(body)

  if (!result.success) {
    throw createError({ statusCode: 400, message: 'Invalid input', data: result.error.issues })
  }

  const userId = (session.user as any).id

  try {
    // 1. Fetch integration
    const integration = await prisma.integration.findFirst({
      where: { userId, provider: 'intervals' }
    })

    // 2. Update local event
    const updatedEvent = await eventRepository.update(id, userId, {
      ...result.data,
      priority: result.data.priority || null,
      date: new Date(result.data.date),
      syncStatus: integration ? 'PENDING' : 'LOCAL_ONLY'
    })

    let finalEvent = updatedEvent

    // 3. Sync if needed
    if (integration && updatedEvent.externalId && updatedEvent.source === 'intervals') {
      const syncResult = await syncEventToIntervals('UPDATE', updatedEvent, userId)
      if (syncResult.synced) {
        finalEvent = await eventRepository.update(id, userId, {
          syncStatus: 'SYNCED'
        })
      }
    }

    return { success: true, event: finalEvent }
  } catch (error: any) {
    if (error.message.includes('Not authorized')) {
      throw createError({ statusCode: 403, message: error.message })
    }
    throw createError({ statusCode: 500, message: error.message })
  }
})
