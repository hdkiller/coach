import { prisma } from '../db'
import { logAction } from '../audit'
import { dispatchTask } from '../task-dispatcher'
import { registerTaskHandler } from '../task-registry'
import { deRegisterGarminUser } from '../garmin'
import { getEmailTemplateDefinition } from '../email-template-registry'
import { getInternalApiToken } from '../internal-api-token'
import { EmailDeliveryService } from './emailDeliveryService'

type DeletionActorType = 'self' | 'admin'

interface ScheduleAccountDeletionOptions {
  userId: string
  actor: {
    type: DeletionActorType
    id: string
    email?: string | null
  }
  event?: any
}

export async function scheduleAccountDeletion(options: ScheduleAccountDeletionOptions) {
  const { userId, actor, event } = options

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true
    }
  })

  if (!user) {
    throw new Error('User not found')
  }

  const handle = await dispatchTask(
    'delete-user-account',
    {
      userId,
      notificationEmail: {
        requestedAt: new Date().toISOString(),
        initiatedBy: actor.type,
        actorEmail: actor.type === 'admin' ? actor.email || null : null
      }
    },
    {
      concurrencyKey: userId,
      tags: [`user:${userId}`]
    }
  )

  await logAction({
    userId,
    action:
      actor.type === 'admin'
        ? 'ADMIN_USER_ACCOUNT_DELETION_REQUESTED'
        : 'USER_ACCOUNT_DELETION_REQUESTED',
    resourceType: 'User',
    resourceId: userId,
    metadata: {
      jobId: handle.id,
      initiatedBy: actor.type,
      actorUserId: actor.id,
      actorEmail: actor.email || null
    },
    event
  })

  try {
    await prisma.session.deleteMany({
      where: { userId }
    })
  } catch (error) {
    console.error('Failed to clear sessions immediately', { userId, error })
  }

  return {
    success: true,
    jobId: handle.id,
    message: 'Account scheduled for deletion'
  }
}

export async function runDeleteUserAccount(payload: {
  userId: string
  notificationEmail?: {
    requestedAt: string
    initiatedBy: 'self' | 'admin'
    actorEmail?: string | null
  }
}) {
  const { userId, notificationEmail } = payload

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

    const garminIntegration = await prisma.integration.findFirst({
      where: { userId, provider: 'garmin' }
    })
    if (garminIntegration) {
      try {
        await deRegisterGarminUser(garminIntegration)
      } catch (error) {
        console.warn('Garmin deregistration failed during account deletion; continuing', {
          userId,
          error
        })
      }
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
          console.error('Failed to send account deletion email', { userId, error })
        }
      }
    }

    const deletedUser = await prisma.user.delete({
      where: { id: userId }
    })

    return {
      success: true,
      userId
    }
  } catch (error) {
    console.error('Failed to delete user', { userId, error })
    throw error
  }
}

registerTaskHandler('delete-user-account', runDeleteUserAccount)
