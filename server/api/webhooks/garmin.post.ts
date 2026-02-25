import { webhookQueue } from '../../utils/queue'
import { logWebhookRequest, updateWebhookStatus } from '../../utils/webhook-logger'

defineRouteMeta({
  openAPI: {
    tags: ['Integrations'],
    summary: 'Garmin Webhook',
    description: 'Handles Garmin Push API notifications asynchronously via Redis queue.',
    responses: {
      200: { description: 'OK' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const payload = await readBody(event)
  const headers = getRequestHeaders(event)

  try {
    // Garmin Push API sends lists of records (activities, sleeps, etc.)
    // We enqueue the entire payload for the worker to handle logging and processing
    await webhookQueue.add('garmin-webhook', {
      provider: 'garmin',
      payload,
      headers
    })

    return { success: true }
  } catch (error: any) {
    console.error('[Garmin Webhook] Failed to queue request:', error)
    return { success: true } // Always return 200 to Garmin
  }
})
