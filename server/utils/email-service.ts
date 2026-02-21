import { tasks } from '@trigger.dev/sdk/v3'
import type { EmailAudience } from '@prisma/client'
import { getEmailTemplateDefinition } from './email-template-registry'

/**
 * Triggers the background email task through a single service-layer entrypoint.
 */
export async function queueEmail(options: {
  userId: string
  templateKey: string
  eventKey: string
  audience?: EmailAudience
  subject?: string
  props?: Record<string, any>
  idempotencyKey?: string
}) {
  const { userId, templateKey, eventKey, audience, subject, props = {}, idempotencyKey } = options
  const template = getEmailTemplateDefinition(templateKey)

  if (!template && (!audience || !subject)) {
    throw new Error(`Unknown template '${templateKey}'. Provide explicit audience and subject.`)
  }

  return await tasks.trigger('send-email', {
    userId,
    templateKey,
    eventKey,
    audience: audience || template!.audience,
    subject: subject || template!.defaultSubject,
    props,
    idempotencyKey
  })
}
