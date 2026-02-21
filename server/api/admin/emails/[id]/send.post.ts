import { prisma } from '../../../../utils/db'
import { getResend } from '../../../../utils/email'
import { getServerSession } from '../../../../utils/session'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden'
    })
  }

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing ID' })
  }

  const delivery = await prisma.emailDelivery.findUnique({ where: { id } })

  if (!delivery) {
    throw createError({ statusCode: 404, statusMessage: 'Email delivery not found' })
  }

  if (delivery.status !== 'QUEUED' && delivery.status !== 'FAILED') {
    throw createError({ statusCode: 400, statusMessage: 'Email is not in a sendable state' })
  }

  if (!delivery.htmlBody) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email HTML body is missing. Cannot send.'
    })
  }

  const resend = getResend()
  if (!resend) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Resend is not configured (RESEND_API_KEY)'
    })
  }

  try {
    const from =
      delivery.fromEmail || process.env.MAIL_FROM_ADDRESS || 'Coach Watts <onboarding@resend.dev>'

    const lockResult = await prisma.emailDelivery.updateMany({
      where: {
        id,
        status: {
          in: ['QUEUED', 'FAILED']
        }
      },
      data: {
        status: 'SENDING',
        errorMessage: null
      }
    })
    if (lockResult.count === 0) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Email is already being sent'
      })
    }

    const response = await resend.emails.send({
      from,
      to: delivery.toEmail,
      subject: delivery.subject,
      html: delivery.htmlBody,
      text: delivery.textBody || undefined,
      replyTo: delivery.replyToEmail || undefined
    })

    if (response.error) {
      throw new Error(response.error.message)
    }

    const updated = await prisma.emailDelivery.update({
      where: { id },
      data: {
        status: 'SENT',
        providerMessageId: response.data?.id,
        sentAt: new Date(),
        errorMessage: null
      }
    })

    return { success: true, data: updated }
  } catch (error: any) {
    if (error?.statusCode === 409) {
      throw error
    }

    console.error('Failed to manually send email:', error)

    await prisma.emailDelivery.update({
      where: { id },
      data: {
        status: 'FAILED',
        errorMessage: error.message
      }
    })

    throw createError({ statusCode: 500, statusMessage: `Failed to send: ${error.message}` })
  }
})
