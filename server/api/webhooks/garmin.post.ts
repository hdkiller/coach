import { logWebhookRequest } from '../../utils/webhook-logger'

defineRouteMeta({
  openAPI: {
    tags: ['Integrations'],
    summary: 'Garmin Webhook',
    description:
      'Handles Garmin Push API notifications. Data is stored in SQL and processed asynchronously by the worker.',
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
    // We log the entire payload to SQL with status PENDING for the worker poller to pick up
    await logWebhookRequest({
      provider: 'garmin',
      eventType: 'PUSH',
      payload,
      headers,
      status: 'PENDING'
    })

    return { success: true }
  } catch (error: any) {
    console.error('[Garmin Webhook] Failed to log request:', error)
    return { success: true } // Always return 200 to Garmin
  }
})
