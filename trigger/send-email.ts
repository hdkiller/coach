import { task, logger } from '@trigger.dev/sdk/v3'
import type { EmailAudience, EmailDeliveryStatus } from '@prisma/client'
import { prisma } from '../server/utils/db'
import { emailQueue } from './queues'
import { generateUnsubscribeToken } from '../server/utils/unsubscribe-token'
import {
  EMAIL_TEMPLATE_REGISTRY,
  getEmailTemplateDefinition
} from '../server/utils/email-template-registry'
import { getInternalApiToken } from '../server/utils/internal-api-token'

export const sendEmailTask = task({
  id: 'send-email',
  queue: emailQueue,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000
  },
  run: async (payload: {
    userId: string
    templateKey: string
    eventKey: string
    audience: EmailAudience
    subject: string
    props?: Record<string, any>
    idempotencyKey?: string
  }) => {
    const { userId, templateKey, eventKey, audience, subject, props = {}, idempotencyKey } = payload

    logger.log('--- EMAIL TASK START ---', { eventKey, userId, templateKey })
    const template = getEmailTemplateDefinition(templateKey)

    if (template && template.audience !== audience) {
      logger.error('EXIT: Audience mismatch for template', {
        templateKey,
        expectedAudience: template.audience,
        audience
      })
      return
    }

    // 1. Fetch User and Preferences
    logger.log('Step 1: Fetching user and preferences...')
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { emailPreferences: true }
    })

    if (!user) {
      logger.error('CRITICAL: User not found in database', { userId })
      return
    }
    logger.log(`Found user: ${user.email}`)

    // 2. Check Suppression/Unsubscribe
    logger.log('Step 2: Checking suppression and preferences...')
    const preference = user.emailPreferences.find((p) => p.channel === 'EMAIL')
    const globalUnsub = Boolean(preference?.globalUnsubscribe)
    if (globalUnsub && audience !== 'TRANSACTIONAL') {
      logger.log('EXIT: User globally unsubscribed. Skipping non-transactional email.')
      return
    }

    if (template?.preferenceKey && audience !== 'TRANSACTIONAL') {
      const isEnabled = preference ? Boolean((preference as any)[template.preferenceKey]) : true
      if (!isEnabled) {
        logger.log('EXIT: User has disabled this email category.', {
          templateKey,
          preferenceKey: template.preferenceKey
        })
        return
      }
    }

    if (template?.cooldownHours && template.cooldownHours > 0) {
      const throttleKeys = Object.values(EMAIL_TEMPLATE_REGISTRY)
        .filter((entry) => entry.throttleGroup && entry.throttleGroup === template.throttleGroup)
        .map((entry) => entry.templateKey)
      const throttleTemplateKeys = throttleKeys.length > 0 ? throttleKeys : [templateKey]
      const lookbackFrom = new Date(Date.now() - template.cooldownHours * 60 * 60 * 1000)
      const activeStatuses: EmailDeliveryStatus[] = [
        'QUEUED',
        'SENDING',
        'SENT',
        'DELIVERED',
        'OPENED',
        'CLICKED'
      ]

      const recentDelivery = await prisma.emailDelivery.findFirst({
        where: {
          userId,
          templateKey: { in: throttleTemplateKeys },
          createdAt: { gte: lookbackFrom },
          status: { in: activeStatuses }
        },
        orderBy: { createdAt: 'desc' }
      })

      if (recentDelivery) {
        logger.log('EXIT: Cooldown active, skipping email', {
          userId,
          templateKey,
          throttleGroup: template.throttleGroup,
          cooldownHours: template.cooldownHours,
          recentDeliveryId: recentDelivery.id,
          recentCreatedAt: recentDelivery.createdAt
        })
        return
      }
    }

    const isSuppressed = await prisma.emailSuppression.findFirst({
      where: { email: user.email, active: true }
    })

    if (isSuppressed && audience !== 'TRANSACTIONAL') {
      logger.log(`EXIT: Email ${user.email} is suppressed (${isSuppressed.reason}). Skipping.`)
      return
    }
    logger.log('Suppression check passed.')

    // 3. Generate Unsubscribe Token & Link
    const baseUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://coachwatts.com'
    const unsubToken = generateUnsubscribeToken(userId)
    const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${unsubToken}`

    // Inject into props for the template to use in the footer
    const finalProps = {
      ...props,
      unsubscribeUrl
    }

    if (template) {
      const missingProps = template.requiredProps.filter((key) => finalProps[key] == null)
      if (missingProps.length > 0) {
        logger.error('EXIT: Missing required template props', {
          templateKey,
          missingProps
        })
        return
      }
    }

    // 4. Render Template via Internal API
    logger.log('Step 3: Requesting HTML render from internal API...')
    let htmlBody = ''
    let textBody = ''

    try {
      const renderUrl = `${baseUrl}/api/internal/render-email`
      logger.log(`POST ${renderUrl}`, { templateKey })

      const internalApiToken = getInternalApiToken()
      if (!internalApiToken) {
        throw new Error('INTERNAL_API_TOKEN is not configured')
      }

      const response = await fetch(renderUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-token': internalApiToken
        },
        body: JSON.stringify({ templateKey, props: finalProps })
      })

      if (!response.ok) {
        const errorText = await response.text()
        logger.error('Render API Error Response', { status: response.status, body: errorText })
        throw new Error(`Render API failed (${response.status}): ${errorText}`)
      }

      const result = (await response.json()) as any
      htmlBody = result.html
      textBody = result.text

      logger.log('Render Successful', { htmlLength: htmlBody?.length })
    } catch (renderError: any) {
      logger.error('CRITICAL: Failed to render email', { error: renderError.message })
      throw renderError
    }

    // 5. Save to Database as QUEUED
    logger.log('Step 4: Saving delivery record to database...')
    try {
      const delivery = await prisma.emailDelivery.create({
        data: {
          userId: user.id,
          toEmail: user.email,
          templateKey,
          eventKey,
          audience,
          subject,
          htmlBody,
          textBody,
          status: 'QUEUED',
          idempotencyKey,
          metadata: finalProps as any
        }
      })

      logger.log('--- EMAIL TASK SUCCESS ---', { deliveryId: delivery.id, recipient: user.email })

      return {
        success: true,
        deliveryId: delivery.id
      }
    } catch (dbError: any) {
      if (dbError.code === 'P2002' && dbError.meta?.target?.includes('idempotencyKey')) {
        logger.log('EXIT: Duplicate detected (idempotencyKey collision)', { idempotencyKey })
        return { success: true, skipped: true, reason: 'Duplicate' }
      }
      logger.error('CRITICAL: Database save failed', { error: dbError.message, code: dbError.code })
      throw dbError
    }
  }
})
