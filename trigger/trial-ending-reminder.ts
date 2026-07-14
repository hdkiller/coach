import { schedules, tasks, logger } from '@trigger.dev/sdk/v3'
import { prisma } from '../server/utils/db'
import { QUOTA_REGISTRY } from '../server/utils/quotas/registry'
import { formatUserDate } from '../server/utils/date'

function getTrialEndingWindow(now = new Date()) {
  const targetDay = new Date(now)
  targetDay.setUTCDate(targetDay.getUTCDate() + 2)
  targetDay.setUTCHours(0, 0, 0, 0)

  const windowEnd = new Date(targetDay)
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 1)

  return { windowStart: targetDay, windowEnd }
}

async function getWeeklyUsageSummary(userId: string) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const rows = await prisma.llmUsage.groupBy({
    by: ['operation'],
    where: {
      userId,
      success: true,
      counted: true,
      createdAt: { gte: since }
    },
    _count: { _all: true },
    orderBy: { _count: { operation: 'desc' } },
    take: 4
  })

  return rows.map((row) => ({
    operation: row.operation.replace(/_/g, ' '),
    count: row._count._all
  }))
}

function formatSupporterHighlights() {
  const supporter = QUOTA_REGISTRY.SUPPORTER
  return [
    { label: 'Daily check-ins', value: `${supporter.daily_checkin?.limit ?? 0}/day` },
    {
      label: 'Activity recommendations',
      value: `${supporter.activity_recommendation?.limit ?? 0}/day`
    },
    { label: 'Workout analysis', value: `${supporter.workout_analysis?.limit ?? 0}/week` },
    { label: 'AI chat', value: `${supporter.chat?.limit ?? 0}/4h` }
  ]
}

export const trialEndingReminderCron = schedules.task({
  id: 'trial-ending-reminder-cron',
  cron: '0 9 * * *',
  run: async () => {
    const now = new Date()
    const { windowStart, windowEnd } = getTrialEndingWindow(now)

    const users = await prisma.user.findMany({
      where: {
        subscriptionTier: 'FREE',
        deactivatedAt: null,
        trialEndsAt: {
          gte: windowStart,
          lt: windowEnd
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        timezone: true,
        trialEndsAt: true
      }
    })

    logger.log('Trial ending reminder candidates', {
      count: users.length,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString()
    })

    for (const user of users) {
      if (!user.trialEndsAt) continue

      const trialEndKey = user.trialEndsAt.toISOString().slice(0, 10)
      const usageHighlights = await getWeeklyUsageSummary(user.id)

      await tasks.trigger('send-email', {
        userId: user.id,
        templateKey: 'TrialEndingSoon',
        eventKey: `TRIAL_ENDING_${trialEndKey}`,
        idempotencyKey: `trial-ending:${user.id}:${trialEndKey}`,
        audience: 'ENGAGEMENT',
        subject: 'Your Coach Watts performance trial ends soon',
        props: {
          name: user.name || 'Athlete',
          trialEndsAt: formatUserDate(user.trialEndsAt, user.timezone || 'UTC', 'EEEE, MMMM d'),
          usageHighlights,
          supporterHighlights: formatSupporterHighlights(),
          pricingUrl: `${process.env.NUXT_PUBLIC_SITE_URL || 'https://coachwatts.com'}/settings/billing`
        }
      })
    }

    return { success: true, count: users.length }
  }
})
