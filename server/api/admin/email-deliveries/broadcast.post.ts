import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth-guard'
import { prisma } from '../../../utils/db'
import { dispatchTask } from '../../../utils/task-dispatcher'

const broadcastSchema = z.object({
  subject: z.string().min(1),
  headline: z.string().min(1),
  bodyContent: z.string().min(1),
  ctaLabel: z.string().optional(),
  ctaUrl: z.string().url().optional(),
  dryRun: z.boolean().optional().default(false)
})

defineRouteMeta({
  openAPI: {
    tags: ['Admin'],
    summary: 'Broadcast marketing email',
    description:
      'Enqueues a marketing broadcast to all opted-in, unsuppressed users with opt-in preference enforcement.',
    responses: {
      200: { description: 'Success' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' }
    }
  }
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, broadcastSchema.parse)

  const users = await prisma.user.findMany({
    where: {
      deactivatedAt: null,
      emailStatus: 'VALID',
      emailPreferences: {
        some: {
          channel: 'EMAIL',
          marketing: true,
          globalUnsubscribe: false
        }
      }
    },
    select: {
      id: true,
      email: true,
      name: true
    }
  })

  const activeSuppressions = await prisma.emailSuppression.findMany({
    where: { active: true },
    select: { email: true }
  })
  const suppressedEmails = new Set(activeSuppressions.map((s) => s.email.toLowerCase()))

  const targetUsers = users.filter((user) => !suppressedEmails.has(user.email.toLowerCase()))

  if (body.dryRun) {
    return {
      success: true,
      dryRun: true,
      targetCount: targetUsers.length,
      sampleRecipients: targetUsers.slice(0, 5).map((u) => u.email)
    }
  }

  const campaignId = `mkt_${Date.now()}`
  let queuedCount = 0

  for (const user of targetUsers) {
    try {
      await dispatchTask('send-email', {
        userId: user.id,
        templateKey: 'MarketingBroadcast',
        eventKey: 'MARKETING_BROADCAST',
        audience: 'MARKETING',
        subject: body.subject,
        idempotencyKey: `broadcast:${campaignId}:${user.id}`,
        props: {
          name: user.name || 'Athlete',
          headline: body.headline,
          bodyContent: body.bodyContent,
          ctaLabel: body.ctaLabel,
          ctaUrl: body.ctaUrl
        }
      })
      queuedCount++
    } catch (err) {
      console.error(`Failed to queue broadcast for ${user.id}`, err)
    }
  }

  return {
    success: true,
    campaignId,
    targetCount: targetUsers.length,
    queuedCount
  }
})
