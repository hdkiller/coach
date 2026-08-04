import { getServerSession } from '#auth'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session || !session.user || !(session.user as any).id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const userId = (session.user as any).id as string
  const body = await readBody(event)
  const { eventId } = body

  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Event ID is required'
    })
  }

  try {
    // Check if event exists and get current participants
    const targetEvent = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        participants: {
          where: { id: userId },
          select: { id: true }
        }
      }
    })

    if (!targetEvent) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Event not found'
      })
    }

    const isParticipating = targetEvent.participants.length > 0

    // Toggle participation
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        participants: {
          [isParticipating ? 'disconnect' : 'connect']: { id: userId }
        }
      },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    })

    return updatedEvent
  } catch (error: any) {
    console.error('RSVP Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update RSVP status.'
    })
  }
})
