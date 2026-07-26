import { dispatchTask } from './task-dispatcher'
import { prisma } from './db'

const INITIAL_INGEST_WINDOWS: Record<string, number> = {
  intervals: 365,
  strava: 30
}

export async function userHasHealthConsent(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { healthConsentAcceptedAt: true }
  })

  return Boolean(user?.healthConsentAcceptedAt)
}

export async function triggerInitialProviderIngest(userId: string, provider: string) {
  const windowDays = INITIAL_INGEST_WINDOWS[provider]
  if (!windowDays) {
    return
  }

  const endDate = new Date().toISOString()
  const startDate = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString()
  const taskId = provider === 'intervals' ? 'ingest-intervals' : 'ingest-strava'

  await dispatchTask(
    taskId,
    {
      userId,
      startDate,
      endDate
    },
    {
      concurrencyKey: userId,
      tags: [`user:${userId}`]
    }
  )

  if (provider === 'intervals') {
    await dispatchTask(
      'autodetect-intervals-profile',
      { userId },
      { concurrencyKey: userId, tags: [`user:${userId}`] }
    )
  }
}

export async function triggerDeferredProviderIngests(userId: string) {
  const integrations = await prisma.integration.findMany({
    where: {
      userId,
      provider: { in: Object.keys(INITIAL_INGEST_WINDOWS) }
    },
    select: { provider: true }
  })

  for (const integration of integrations) {
    await triggerInitialProviderIngest(userId, integration.provider)
  }
}
