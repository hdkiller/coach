import { task, logger } from '@trigger.dev/sdk/v3'
import { ResendService } from '../server/utils/services/resendService'
import { updateWebhookStatus } from '../server/utils/webhook-logger'

export const processResendWebhookTask = task({
  id: 'process-resend-webhook',
  retry: {
    maxAttempts: 5,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000
  },
  run: async (payload: { webhookLogId: string; type: string; data: any; createdAt: string }) => {
    const { webhookLogId, type, data, createdAt } = payload
    logger.log('Processing Resend webhook', { webhookLogId, type })

    try {
      const result = await ResendService.processWebhookEvent(type, data, createdAt)

      if (result.handled) {
        await updateWebhookStatus(webhookLogId, 'PROCESSED')
        logger.log('Resend webhook processed successfully', { result: result.message })
      } else {
        await updateWebhookStatus(webhookLogId, 'SKIPPED', result.message)
        logger.log('Resend webhook skipped', { reason: result.message })
      }

      return result
    } catch (error: any) {
      logger.error('Failed to process Resend webhook', { error: error.message })
      // We don't update status to FAILED here to allow Trigger.dev retries
      // If it's the last attempt, we might want to, but Trigger.dev handles retries better
      throw error
    }
  }
})
