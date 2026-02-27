import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import { deRegisterGarminUser } from '../../../utils/garmin'

defineRouteMeta({
  openAPI: {
    tags: ['Integrations'],
    summary: 'Disconnect Garmin',
    description: 'Removes the Garmin Connect integration for the current user.',
    responses: {
      200: { description: 'Success' },
      401: { description: 'Unauthorized' },
      404: { description: 'Integration not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const integration = await prisma.integration.findUnique({
    where: {
      userId_provider: {
        userId: session.user.id,
        provider: 'garmin'
      }
    }
  })

  if (!integration) {
    throw createError({
      statusCode: 404,
      message: 'Garmin integration not found'
    })
  }

  try {
    await deRegisterGarminUser(integration)
  } catch (error) {
    console.error(
      'Failed to de-register Garmin user token (continuing with local deletion):',
      error
    )
  }

  await prisma.integration.delete({
    where: { id: integration.id }
  })

  return { success: true }
})
