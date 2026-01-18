import { webhookQueue } from '../../../utils/queue'

defineRouteMeta({
  openAPI: {
    tags: ['Integrations'],
    summary: 'Whoop async webhook',
    description:
      'Handles incoming webhook notifications from Whoop asynchronously via Redis queue.',
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

  try {
    // Enqueue the request for the worker to handle
    await webhookQueue.add('whoop-webhook', {
      provider: 'whoop',
      payload: body,
      headers
    })
  } catch (error: any) {
    console.error('[Whoop Webhook Async] Failed to queue request:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error'
    })
  }

  return 'OK'
})
