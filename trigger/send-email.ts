import { task, logger } from '@trigger.dev/sdk/v3'
import type { EmailAudience } from '@prisma/client'
import { emailQueue } from './queues'
import { EmailDeliveryService } from '../server/utils/services/emailDeliveryService'

export const sendEmailTask = task({
  id: 'send-email',
  queue: emailQueue,
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000
  },
  run: async (payload: {
    userId: string
    templateKey: string
    eventKey: string
    audience: EmailAudience
    subject: string
    props?: Record<string, any>
    idempotencyKey?: string
  }) => {
    logger.log('--- EMAIL TASK START VIA TRIGGER.DEV ---', {
      eventKey: payload.eventKey,
      userId: payload.userId
    })
    return await EmailDeliveryService.runSendEmail(payload)
  }
})
