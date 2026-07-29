import { prisma } from '../db'
import { getResend } from '../email'
import { registerTaskHandler } from '../task-registry'
import { generateUnsubscribeToken } from '../unsubscribe-token'
import { EMAIL_TEMPLATE_REGISTRY, getEmailTemplateDefinition } from '../email-template-registry'
import { getInternalApiToken } from '../internal-api-token'
import type { EmailAudience, EmailDeliveryStatus } from '@prisma/client'

export const EmailDeliveryService = {
  /**
   * Dispatches a queued or failed email delivery record via Resend.
   * Handles status updates (SENDING -> SENT/FAILED) and locking.
   */
  async dispatch(deliveryId: string) {
    const delivery = await prisma.emailDelivery.findUnique({
      where: { id: deliveryId }
    })

    if (!delivery) {
      throw new Error('Email delivery not found')
    }

    if (delivery.status !== 'QUEUED' && delivery.status !== 'FAILED') {
      throw new Error(`Email is not in a sendable state (status: ${delivery.status})`)
    }

    if (!delivery.htmlBody) {
      throw new Error('Email HTML body is missing. Cannot send.')
    }

    const resend = getResend()
    if (!resend) {
      throw new Error('Resend is not configured (RESEND_API_KEY missing)')
    }

    // 1. Lock and set to SENDING
    const lockResult = await prisma.emailDelivery.updateMany({
      where: {
        id: deliveryId,
        status: {
          in: ['QUEUED', 'FAILED']
        }
      },
      data: {
        status: 'SENDING',
        errorMessage: null
      }
    })

    if (lockResult.count === 0) {
      throw new Error('Email is already being sent or state changed')
    }

    try {
      const from =
        delivery.fromEmail ||
        process.env.MAIL_FROM_ADDRESS ||
        'Journey Endurance Coaching <onboarding@resend.dev>'

      const response = await resend.emails.send({
        from,
        to: delivery.toEmail,
        subject: delivery.subject,
        html: delivery.htmlBody,
        text: delivery.textBody || undefined,
        replyTo: delivery.replyToEmail || undefined
      })

      if (response.error) {
        throw new Error(response.error.message)
      }

      // 2. Success
      return await prisma.emailDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'SENT',
          providerMessageId: response.data?.id,
          sentAt: new Date(),
          errorMessage: null
        }
      })
    } catch (error: any) {
      console.error(`[EmailDeliveryService] Dispatch failed for ${deliveryId}:`, error)

      // 3. Mark as FAILED
      await prisma.emailDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'FAILED',
          errorMessage: error.message
        }
      })

      throw error
    }
  },

  async runSendEmail(payload: {
    userId: string
    templateKey: string
    eventKey: string
    audience: EmailAudience
    subject: string
    props?: Record<string, any>
    idempotencyKey?: string
  }) {
    const { userId, templateKey, eventKey, audience, subject, props = {}, idempotencyKey } = payload

    const template = getEmailTemplateDefinition(templateKey)

    if (template && template.audience !== audience) {
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { emailPreferences: true }
    })

    if (!user) return

    if (user.emailStatus !== 'VALID' && audience !== 'TRANSACTIONAL') return

    const preference = user.emailPreferences.find((p) => p.channel === 'EMAIL')
    const globalUnsub = Boolean(preference?.globalUnsubscribe)
    if (globalUnsub && audience !== 'TRANSACTIONAL') return

    if (template?.preferenceKey && audience !== 'TRANSACTIONAL') {
      const isEnabled = preference ? Boolean((preference as any)[template.preferenceKey]) : true
      if (!isEnabled) return
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

      if (recentDelivery) return
    }

    const isSuppressed = await prisma.emailSuppression.findFirst({
      where: { email: user.email, active: true }
    })

    if (isSuppressed && audience !== 'TRANSACTIONAL') return

    const baseUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://coachwatts.com'
    const unsubToken = generateUnsubscribeToken(userId)
    const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${unsubToken}`

    let utmQuery = ''
    if (template) {
      const params = new URLSearchParams({
        utm_source: 'coachwatts_email',
        utm_medium: template.utmMedium,
        utm_campaign: template.utmCampaign
      })
      utmQuery = `?${params.toString()}`
    }

    const finalProps: Record<string, any> = {
      ...props,
      unsubscribeUrl,
      utmQuery
    }

    if (template) {
      const missingProps = template.requiredProps.filter((key: string) => finalProps[key] == null)
      if (missingProps.length > 0) return
    }

    const renderUrl = `${baseUrl}/api/internal/render-email`
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
      throw new Error(`Render API failed (${response.status}): ${errorText}`)
    }

    const result = (await response.json()) as any
    const htmlBody: string = result.html
    const textBody: string = result.text

    let delivery
    try {
      delivery = await prisma.emailDelivery.create({
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
    } catch (dbError: any) {
      if (dbError.code === 'P2002' && dbError.meta?.target?.includes('idempotencyKey')) {
        return { success: true, skipped: true, reason: 'Duplicate' }
      }
      throw dbError
    }

    const disableEmails = process.env.DISABLE_EMAILS === 'true'
    if (disableEmails) {
      return { success: true, deliveryId: delivery.id, status: 'QUEUED' }
    }

    try {
      const sent = await EmailDeliveryService.dispatch(delivery.id)
      return { success: true, deliveryId: sent.id, status: 'SENT' }
    } catch (dispatchError: any) {
      return { success: false, deliveryId: delivery.id, error: dispatchError.message }
    }
  }
}

registerTaskHandler('send-email', (payload) => EmailDeliveryService.runSendEmail(payload))
