import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import { tasks } from '@trigger.dev/sdk/v3'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session?.user?.email) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    // Check if integration exists
    const integration = await prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId: user.id,
          provider: 'intervals'
        }
      }
    })

    if (!integration) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Intervals.icu integration not found'
      })
    }

    // Trigger profile auto-detection with forceUpdate: true to ensure it runs
    await tasks.trigger('autodetect-intervals-profile', {
      userId: user.id,
      forceUpdate: true
    })

    return {
      success: true,
      message: 'Profile sync started in background'
    }
  } catch (error: any) {
    console.error('Error triggering profile sync:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to trigger profile sync',
      message: error.message
    })
  }
})
