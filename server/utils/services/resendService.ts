import type { EmailDeliveryStatus } from '@prisma/client'
import { prisma } from '../db'

/**
 * Maps Resend webhook event types to internal EmailDeliveryStatus
 */
function mapStatus(type: string): EmailDeliveryStatus | null {
  switch (type) {
    case 'email.delivered':
      return 'DELIVERED'
    case 'email.opened':
      return 'OPENED'
    case 'email.clicked':
      return 'CLICKED'
    case 'email.bounced':
      return 'BOUNCED'
    case 'email.complained':
      return 'COMPLAINED'
    default:
      return null
  }
}

export const ResendService = {
  /**
   * Process a Resend webhook event from the background worker.
   */
  async processWebhookEvent(type: string, data: any, createdAt: string) {
    const emailId = data?.email_id

    if (!emailId) {
      console.warn('Webhook payload missing email_id', { type, data })
      return { handled: false, message: 'Missing email_id' }
    }

    const status = mapStatus(type)

    if (!status) {
      console.log(`Unhandled webhook type: ${type}`)
      return { handled: false, message: `Unhandled type: ${type}` }
    }

    const delivery = await prisma.emailDelivery.findUnique({
      where: { providerMessageId: emailId }
    })

    if (!delivery) {
      console.warn(`EmailDelivery not found for providerMessageId: ${emailId}`)
      // Depending on the timing, the webhook might arrive before the 'send' task
      // has finished writing the providerMessageId to the database.
      // BullMQ will retry this task if we throw an error.
      throw new Error(`Delivery not found for id: ${emailId}, will retry`)
    }

    const updateData: any = { status }
    const timestamp = new Date(createdAt)

    switch (status) {
      case 'DELIVERED':
        updateData.deliveredAt = timestamp
        break
      case 'OPENED':
        updateData.openedAt = timestamp
        break
      case 'CLICKED':
        updateData.clickedAt = timestamp
        break
      case 'BOUNCED':
        updateData.bouncedAt = timestamp
        // Also add to suppression list
        await prisma.emailSuppression.upsert({
          where: {
            email_reason_active: {
              email: delivery.toEmail,
              reason: 'BOUNCE',
              active: true
            }
          },
          update: { updatedAt: new Date() },
          create: {
            email: delivery.toEmail,
            reason: 'BOUNCE',
            source: 'webhook'
          }
        })
        break
      case 'COMPLAINED':
        updateData.complainedAt = timestamp
        // Also add to suppression list
        await prisma.emailSuppression.upsert({
          where: {
            email_reason_active: {
              email: delivery.toEmail,
              reason: 'COMPLAINT',
              active: true
            }
          },
          update: { updatedAt: new Date() },
          create: {
            email: delivery.toEmail,
            reason: 'COMPLAINT',
            source: 'webhook'
          }
        })
        break
    }

    await prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: updateData
    })

    return { handled: true, message: `Updated email delivery ${delivery.id} to status ${status}` }
  }
}
