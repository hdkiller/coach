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

defineRouteMeta({
  openAPI: {
    tags: ['Events'],
    summary: 'Create a new racing event',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['title', 'date'],
            properties: {
              title: { type: 'string' },
              date: { type: 'string', format: 'date-time' },
              priority: { type: 'string', enum: ['A', 'B', 'C'] },
              isVirtual: { type: 'boolean' },
              isPublic: { type: 'boolean' }
            }
          }
        }
      }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = await readBody(event)
  const result = eventSchema.safeParse(body)

  if (!result.success) {
    throw createError({ statusCode: 400, message: 'Invalid input', data: result.error.issues })
  }

  const userId = (session.user as any).id

  try {
    // 1. Determine initial sync status
    const integration = await prisma.integration.findFirst({
      where: { userId, provider: 'intervals' }
    })

    const initialSyncStatus = integration ? 'PENDING' : 'LOCAL_ONLY'

    // 2. Create local event
    const newEvent = await eventRepository.create(userId, {
      ...result.data,
      priority: result.data.priority || null,
      date: new Date(result.data.date),
      syncStatus: initialSyncStatus
    })

    let finalEvent = newEvent

    // 3. Attempt sync if integration exists
    if (integration) {
      const syncResult = await syncEventToIntervals('CREATE', newEvent, userId)

      if (syncResult.synced && syncResult.result?.id) {
        finalEvent = await eventRepository.update(newEvent.id, userId, {
          externalId: String(syncResult.result.id),
          source: 'intervals',
          syncStatus: 'SYNCED'
        })
      }
    }

    return { success: true, event: finalEvent }
  } catch (error: any) {
    throw createError({ statusCode: 500, message: error.message })
  }
})
