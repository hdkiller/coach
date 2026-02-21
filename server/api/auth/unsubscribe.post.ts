import { verifyUnsubscribeToken } from '../../utils/unsubscribe-token'
import { prisma } from '../../utils/db'
import { z } from 'zod'

const unsubscribeSchema = z.object({
  token: z.string(),
  all: z.boolean().default(true) // Currently we only support global unsubscribe via token
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const result = unsubscribeSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request'
    })
  }

  const { token } = result.data
  const userId = verifyUnsubscribeToken(token)

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid or expired unsubscribe token'
    })
  }

  // Update preferences to global unsubscribe
  await prisma.emailPreference.upsert({
    where: {
      userId_channel: {
        userId,
        channel: 'EMAIL'
      }
    },
    update: {
      globalUnsubscribe: true,
      consentUpdatedAt: new Date()
    },
    create: {
      userId,
      channel: 'EMAIL',
      globalUnsubscribe: true,
      consentUpdatedAt: new Date()
    }
  })

  // Also add to suppression list for good measure (MANUAL reason)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true }
  })

  if (user) {
    await prisma.emailSuppression.upsert({
      where: {
        email_reason_active: {
          email: user.email,
          reason: 'MANUAL',
          active: true
        }
      },
      update: { updatedAt: new Date() },
      create: {
        email: user.email,
        reason: 'MANUAL',
        source: 'unsubscribe_page'
      }
    })
  }

  return {
    success: true,
    message: 'You have been successfully unsubscribed from all optional emails.'
  }
})
