import { prisma } from '../db'
import { getResend } from '../email'

export const EmailDeliveryService = {
  /**
   * Dispatches a queued or failed email delivery record via Resend.
   * Handles status updates (SENDING -> SENT/FAILED) and locking.
   */
  async dispatch(deliveryId: string) {
    const delivery = await prisma.emailDelivery.findUnique({
      where: { id: deliveryId }
    })

    if (!delivery) {
      throw new Error('Email delivery not found')
    }

    if (delivery.status !== 'QUEUED' && delivery.status !== 'FAILED') {
      throw new Error(`Email is not in a sendable state (status: ${delivery.status})`)
    }

    if (!delivery.htmlBody) {
      throw new Error('Email HTML body is missing. Cannot send.')
    }

    const resend = getResend()
    if (!resend) {
      throw new Error('Resend is not configured (RESEND_API_KEY missing)')
    }

    // 1. Lock and set to SENDING
    const lockResult = await prisma.emailDelivery.updateMany({
      where: {
        id: deliveryId,
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
      throw new Error('Email is already being sent or state changed')
    }

    try {
      const from =
        delivery.fromEmail || process.env.MAIL_FROM_ADDRESS || 'Coach Watts <onboarding@resend.dev>'

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

      // 2. Success
      return await prisma.emailDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'SENT',
          providerMessageId: response.data?.id,
          sentAt: new Date(),
          errorMessage: null
        }
      })
    } catch (error: any) {
      console.error(`[EmailDeliveryService] Dispatch failed for ${deliveryId}:`, error)

      // 3. Mark as FAILED
      await prisma.emailDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'FAILED',
          errorMessage: error.message
        }
      })

      throw error
    }
  }
}
