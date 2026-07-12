import { tasks } from '@trigger.dev/sdk/v3'
import { logWebhookRequest, updateWebhookStatus } from '../../../utils/webhook-logger'
import { isWithingsWebhookVerification } from '../../../utils/withings-notifications'
// prisma is auto-imported in server routes

defineRouteMeta({
  openAPI: {
    tags: ['Integrations'],
    summary: 'Withings webhook',
    description: 'Handles incoming webhook notifications from Withings.',
    requestBody: {
      content: {
        'application/x-www-form-urlencoded': {
          schema: {
            type: 'object',
            properties: {
              userid: { type: 'string' },
              appli: { type: 'string' },
              startdate: { type: 'string' },
              enddate: { type: 'string' }
            }
          }
        },
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              userid: { type: 'string' },
              appli: { type: 'string' },
              startdate: { type: 'string' },
              enddate: { type: 'string' }
            }
          }
        }
      }
    },
    responses: {
      200: { description: 'OK' },
      400: { description: 'Missing userid' }
    }
  }
})

export default defineEventHandler(async (event) => {
  // Withings sends HEAD to verify the endpoint exists
  if (event.method === 'HEAD') {
    return 'OK'
  }

  const body = await readBody(event)
  const query = getQuery(event)
  const headers = getRequestHeaders(event)

  const params = { ...query, ...(typeof body === 'object' && body != null ? body : {}) }

  // Withings sends empty-body POSTs during subscription registration (no userid)
  if (isWithingsWebhookVerification(params, headers)) {
    console.log('[Withings Webhook] Verification request acknowledged')
    await logWebhookRequest({
      provider: 'withings',
      eventType: 'VERIFY',
      payload: params,
      headers,
      status: 'PROCESSED'
    })
    return 'OK'
  }

  const { userid, startdate, enddate } = params

  const log = await logWebhookRequest({
    provider: 'withings',
    eventType: 'NOTIFICATION',
    payload: params,
    headers,
    status: 'PENDING'
  })

  console.log('[Withings Webhook] Received notification:', params)

  if (!userid) {
    if (log) await updateWebhookStatus(log.id, 'FAILED', 'Missing userid')
    throw createError({
      statusCode: 400,
      message: 'Missing userid'
    })
  }

  const integration = await prisma.integration.findFirst({
    where: {
      provider: 'withings',
      externalUserId: userid.toString()
    }
  })

  if (!integration) {
    console.warn(`[Withings Webhook] Integration not found for external user ${userid}`)
    if (log)
      await updateWebhookStatus(
        log.id,
        'IGNORED',
        `Integration not found for external user ${userid}`
      )
    return 'OK'
  }

  const now = new Date()
  const start = startdate
    ? new Date(parseInt(startdate) * 1000)
    : new Date(now.setHours(0, 0, 0, 0))
  const end = enddate ? new Date(parseInt(enddate) * 1000) : new Date(now.setHours(23, 59, 59, 999))

  const bufferStart = new Date(start.getTime() - 24 * 60 * 60 * 1000)
  const bufferEnd = new Date(end.getTime() + 24 * 60 * 60 * 1000)

  try {
    await tasks.trigger(
      'ingest-withings',
      {
        userId: integration.userId,
        startDate: bufferStart.toISOString(),
        endDate: bufferEnd.toISOString()
      },
      {
        concurrencyKey: integration.userId,
        tags: [`user:${integration.userId}`]
      }
    )

    console.log(`[Withings Webhook] Triggered ingestion for user ${integration.userId}`)
    if (log) await updateWebhookStatus(log.id, 'PROCESSED')
  } catch (error: any) {
    console.error('[Withings Webhook] Failed to trigger ingestion:', error)
    if (log)
      await updateWebhookStatus(log.id, 'FAILED', error.message || 'Failed to trigger ingestion')
  }

  return 'OK'
})
