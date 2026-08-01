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
  run: async (
    payload: {
      userId: string
      templateKey: string
      eventKey: string
      audience: EmailAudience
      subject: string
      props?: Record<string, any>
      idempotencyKey?: string
    },
    { ctx }
  ) => {
    logger.log('--- EMAIL TASK START VIA TRIGGER.DEV ---', {
      eventKey: payload.eventKey,
      userId: payload.userId,
      attempt: ctx.attempt.number
    })
    // Falls back to a run-scoped dedup key (see EmailDeliveryService.runSendEmail)
    // so a Trigger.dev retry resumes/skips the same delivery instead of
    // creating a brand new one and potentially double-sending.
    return await EmailDeliveryService.runSendEmail(payload, { runId: ctx.run.id })
  }
})
