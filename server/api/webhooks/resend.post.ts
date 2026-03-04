import { Resend } from 'resend'
import { Webhook } from 'svix'
import { logWebhookRequest } from '../../utils/webhook-logger'
import { processResendWebhookTask } from '../../../trigger/process-resend-webhook'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const webhookSecret = config.resendWebhookSecret

  if (!webhookSecret) {
    console.warn('Resend webhook secret not configured')
    return sendError(
      event,
      createError({ statusCode: 500, statusMessage: 'Webhook Secret Not Configured' })
    )
  }

  const payloadString = await readRawBody(event)
  const headers = event.node.req.headers

  if (!payloadString) {
    return sendError(event, createError({ statusCode: 400, statusMessage: 'Missing payload' }))
  }

  const svix_id = headers['svix-id'] as string
  const svix_timestamp = headers['svix-timestamp'] as string
  const svix_signature = headers['svix-signature'] as string

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return sendError(event, createError({ statusCode: 400, statusMessage: 'Missing svix headers' }))
  }

  const wh = new Webhook(webhookSecret as string)
  let payload: any

  try {
    payload = wh.verify(payloadString, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature
    })
  } catch (err: any) {
    console.error('Webhook verification failed', err.message)
    return sendError(event, createError({ statusCode: 400, statusMessage: 'Invalid signature' }))
  }

  // Log to database - set status to PENDING
  const webhookLog = await logWebhookRequest({
    provider: 'resend',
    eventType: payload.type || 'UNKNOWN',
    payload,
    headers,
    status: 'PENDING'
  })

  // Trigger background task for processing if log was successful
  if (webhookLog) {
    await processResendWebhookTask.trigger({
      webhookLogId: webhookLog.id,
      type: payload.type,
      data: payload.data,
      createdAt: payload.created_at
    })
  }

  return { success: true }
})
