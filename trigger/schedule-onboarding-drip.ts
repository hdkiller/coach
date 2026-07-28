import { task, wait, logger } from '@trigger.dev/sdk/v3'
import { prisma } from '../server/utils/db'
import { emailQueue } from './queues'
import { dispatchTask } from '../server/utils/task-dispatcher'

export const scheduleOnboardingDripTask = task({
  id: 'schedule-onboarding-drip',
  queue: emailQueue,
  maxDuration: 900,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000
  },
  run: async (payload: { userId: string }) => {
    const { userId } = payload
    logger.log('Starting onboarding drip sequence', { userId })

    // Wait 2 days for Day 2 integration check
    await wait.for({ days: 2 })

    const userDay2 = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        deactivatedAt: true,
        stravaAccount: { select: { id: true } },
        garminAccount: { select: { id: true } },
        wahooAccount: { select: { id: true } },
        intervalsProfile: { select: { id: true } },
        ouraAccount: { select: { id: true } },
        polarAccount: { select: { id: true } },
        whoopAccount: { select: { id: true } },
        fitbitAccount: { select: { id: true } },
        withingsAccount: { select: { id: true } }
      }
    })

    if (userDay2 && !userDay2.deactivatedAt) {
      const hasIntegration = Boolean(
        userDay2.stravaAccount ||
        userDay2.garminAccount ||
        userDay2.wahooAccount ||
        userDay2.intervalsProfile ||
        userDay2.ouraAccount ||
        userDay2.polarAccount ||
        userDay2.whoopAccount ||
        userDay2.fitbitAccount ||
        userDay2.withingsAccount
      )

      if (!hasIntegration) {
        logger.log('User has no connected integrations on Day 2, sending OnboardingDripDay2', {
          userId
        })
        await dispatchTask('send-email', {
          userId,
          templateKey: 'OnboardingDripDay2',
          eventKey: 'ONBOARDING_DRIP_DAY2',
          idempotencyKey: `onboarding-drip-day2:${userId}`,
          audience: 'ENGAGEMENT',
          subject: 'Connect your training apps to unlock Coach Watts',
          props: {
            name: userDay2.name || 'Athlete'
          }
        })
      } else {
        logger.log('User has connected integrations on Day 2, skipping Day 2 email', { userId })
      }
    }

    // Wait 5 more days (Total 7 days since signup)
    await wait.for({ days: 5 })

    const userDay7 = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, deactivatedAt: true }
    })

    if (userDay7 && !userDay7.deactivatedAt) {
      logger.log('Sending Day 7 onboarding trial check-in email', { userId })
      await dispatchTask('send-email', {
        userId,
        templateKey: 'OnboardingDripDay7',
        eventKey: 'ONBOARDING_DRIP_DAY7',
        idempotencyKey: `onboarding-drip-day7:${userId}`,
        audience: 'ENGAGEMENT',
        subject: 'How was your first week with Coach Watts?',
        props: {
          name: userDay7.name || 'Athlete'
        }
      })
    }

    return { success: true, userId }
  }
})
