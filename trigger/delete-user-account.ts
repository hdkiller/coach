import './init'
import { logger, task } from '@trigger.dev/sdk/v3'
import { EmailDeliveryService } from '../server/utils/services/emailDeliveryService'
import { prisma } from '../server/utils/db'
import { getEmailTemplateDefinition } from '../server/utils/email-template-registry'
import { getInternalApiToken } from '../server/utils/internal-api-token'
import { userBackgroundQueue } from './queues'

export const deleteUserAccountTask = task({
  id: 'delete-user-account',
  queue: userBackgroundQueue,
  maxDuration: 600, // 10 minutes for heavy deletion
  run: async (payload: {
    userId: string
    notificationEmail?: {
      requestedAt: string
      initiatedBy: 'self' | 'admin'
      actorEmail?: string | null
    }
  }) => {
    const { userId, notificationEmail } = payload

    logger.log('Starting user account deletion', { userId })

    // 1. (Optional) Cleanup external resources (S3, external APIs)
    // TODO: Implement S3 cleanup if files are stored there (pdfUrl, profile images)
    // TODO: Revoke external integration tokens if possible/necessary (Intervals, Whoop, etc.)
    // For now, we rely on the DB deletion to remove the tokens from our side.

    // 2. Delete User from Database
    // This will cascade delete almost everything due to the schema relations.
    // LlmUsage records will have userId set to null.
    // ChatMessages might remain but without valid sender link (senderId is string).

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true
        }
      })

      if (!user) {
        throw new Error(`User ${userId} not found`)
      }

      if (notificationEmail) {
        const template = getEmailTemplateDefinition('AccountDeletionScheduled')

        if (template) {
          try {
            const baseUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://coachwatts.com'
            const internalApiToken = getInternalApiToken()

            if (!internalApiToken) {
              throw new Error('INTERNAL_API_TOKEN is not configured')
            }

            const renderResponse = await fetch(`${baseUrl}/api/internal/render-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-internal-api-token': internalApiToken
              },
              body: JSON.stringify({
                templateKey: 'AccountDeletionScheduled',
                props: {
                  name: user.name || 'Athlete',
                  requestedAt: notificationEmail.requestedAt,
                  initiatedBy: notificationEmail.initiatedBy,
                  actorEmail: notificationEmail.actorEmail || null
                }
              })
            })

            if (!renderResponse.ok) {
              throw new Error(`Render API failed (${renderResponse.status})`)
            }

            const rendered = (await renderResponse.json()) as { html: string; text: string }
            const delivery = await prisma.emailDelivery.create({
              data: {
                userId: user.id,
                toEmail: user.email,
                templateKey: template.templateKey,
                eventKey: 'ACCOUNT_DELETION_SCHEDULED',
                audience: template.audience,
                subject: template.defaultSubject,
                htmlBody: rendered.html,
                textBody: rendered.text,
                status: 'QUEUED',
                idempotencyKey: `account-deletion-scheduled:${user.id}:${notificationEmail.requestedAt}`,
                metadata: {
                  requestedAt: notificationEmail.requestedAt,
                  initiatedBy: notificationEmail.initiatedBy,
                  actorEmail: notificationEmail.actorEmail || null
                } as any
              }
            })

            if (process.env.DISABLE_EMAILS !== 'true') {
              await EmailDeliveryService.dispatch(delivery.id)
            }
          } catch (error) {
            logger.error('Failed to send account deletion email', {
              userId,
              error
            })
          }
        }
      }

      const deletedUser = await prisma.user.delete({
        where: { id: userId }
      })

      logger.log('User deleted successfully', { userId, email: deletedUser.email })

      return {
        success: true,
        userId
      }
    } catch (error) {
      logger.error('Failed to delete user', { userId, error })
      throw error
    }
  }
})
