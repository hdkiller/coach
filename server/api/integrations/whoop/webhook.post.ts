import { logWebhookRequest, updateWebhookStatus } from '../../../utils/webhook-logger'

defineRouteMeta({
  openAPI: {
    tags: ['Integrations'],
    summary: 'Whoop webhook',
    description: 'Handles incoming webhook notifications from Whoop.',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            additionalProperties: true
          }
        }
      }
    },
    responses: {
      200: { description: 'OK' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const headers = getRequestHeaders(event)

  // Log receipt
  const log = await logWebhookRequest({
    provider: 'whoop',
    eventType: body?.type || 'UNKNOWN', // Whoop usually sends 'type' or similar, fallback to UNKNOWN
    payload: body,
    headers,
    status: 'PENDING'
  })

  console.log(`[Whoop Webhook] Received event`)

  // We are not processing the data yet, just logging it.
  // Marking as PROCESSED since the goal for now is just to log.
  if (log)
    await updateWebhookStatus(log.id, 'PROCESSED', 'Logged only (processing not implemented)')

  return 'OK'
})
