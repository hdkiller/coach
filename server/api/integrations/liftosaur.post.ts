import { z } from 'zod'
import { getServerSession } from '../../utils/session'
import { fetchLiftosaurPrograms, LiftosaurApiError } from '../../utils/liftosaur'

const connectLiftosaurSchema = z.object({
  apiKey: z.string().trim().min(1, 'API key is required').startsWith('lftsk_', 'Invalid API key')
})

defineRouteMeta({
  openAPI: {
    tags: ['Integrations'],
    summary: 'Connect Liftosaur',
    description: 'Validates and stores a Liftosaur personal API key.',
    responses: {
      200: { description: 'Connected successfully' },
      400: { description: 'Invalid API key' },
      401: { description: 'Unauthorized' },
      403: { description: 'Liftosaur Premium required' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const { apiKey } = await readValidatedBody(event, connectLiftosaurSchema.parse)

  try {
    await fetchLiftosaurPrograms(apiKey)

    const integration = await prisma.integration.upsert({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider: 'liftosaur'
        }
      },
      create: {
        userId: session.user.id,
        provider: 'liftosaur',
        accessToken: apiKey,
        syncStatus: 'SUCCESS',
        initialSyncCompleted: false,
        ingestWorkouts: true,
        settings: {
          activityPreferenceConfigured: true,
          ingestMeasurements: false
        }
      },
      update: {
        accessToken: apiKey,
        syncStatus: 'SUCCESS',
        errorMessage: null
      },
      select: {
        id: true,
        provider: true,
        syncStatus: true,
        ingestWorkouts: true,
        settings: true
      }
    })

    return { success: true, integration }
  } catch (error) {
    if (error instanceof LiftosaurApiError) {
      throw createError({
        statusCode: error.statusCode === 403 ? 403 : 400,
        message: error.message,
        data: { code: error.code }
      })
    }

    throw createError({
      statusCode: 502,
      message: 'Could not verify the Liftosaur API key. Please try again.'
    })
  }
})
