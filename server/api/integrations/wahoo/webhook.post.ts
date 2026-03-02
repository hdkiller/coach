import { processWahooWebhookEvent } from '../../../utils/services/wahooService'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body) {
    return { status: 'error', message: 'No body provided' }
  }

  try {
    const result = await processWahooWebhookEvent(body)
    return result
  } catch (error: any) {
    console.error('[WahooWebhook] Error processing event:', error)
    // We still return 200 to Wahoo to avoid retries if it's a permanent error
    // but we log it.
    return { status: 'error', message: error.message }
  }
})
