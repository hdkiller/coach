import { prisma } from './db'
import { isTaskRunningForUser } from './task-dispatcher'

export const PROVIDER_INGEST_TASKS: Record<string, string> = {
  intervals: 'ingest-intervals',
  whoop: 'ingest-whoop',
  withings: 'ingest-withings',
  yazio: 'ingest-yazio',
  strava: 'ingest-strava',
  rouvy: 'ingest-rouvy',
  hevy: 'ingest-hevy',
  liftosaur: 'ingest-liftosaur',
  fitbit: 'ingest-fitbit',
  oura: 'ingest-oura',
  polar: 'ingest-polar',
  garmin: 'ingest-garmin',
  wahoo: 'ingest-wahoo',
  ultrahuman: 'ingest-ultrahuman'
}

const STALE_SYNC_MESSAGE = 'Previous sync did not complete'

export type SyncBlockReason = 'ingest-all' | 'provider'

export type SyncBlockResult =
  { blocked: false } | { blocked: true; provider: string; reason: SyncBlockReason }

export async function clearStaleSyncStatus(integrationId: string, provider: string) {
  await prisma.integration.update({
    where: { id: integrationId },
    data: {
      syncStatus: 'FAILED',
      errorMessage: STALE_SYNC_MESSAGE
    }
  })

  console.warn(`[Sync] Cleared stale SYNCING status for ${provider} (integration ${integrationId})`)
}

export async function isProviderActivelySyncing(
  userId: string,
  provider: string,
  syncStatus: string | null | undefined
): Promise<boolean> {
  if (syncStatus !== 'SYNCING') {
    return false
  }

  const taskId = PROVIDER_INGEST_TASKS[provider]
  if (!taskId) {
    return false
  }

  try {
    const [providerRunning, batchRunning] = await Promise.all([
      isTaskRunningForUser(taskId, userId),
      isTaskRunningForUser('ingest-all', userId)
    ])

    return providerRunning || batchRunning
  } catch (error) {
    // Couldn't confirm run status (isTaskRunningForUser already retried and
    // gave up) — a transient Trigger.dev/Redis blip. Fail closed: treat the
    // integration as actively syncing so we neither clear its SYNCING
    // status nor let a duplicate sync be dispatched.
    console.warn(
      `[SyncGuard] Unable to determine sync status for provider "${provider}"; assuming active`,
      error
    )
    return true
  }
}

export async function resolveProviderSyncBlock(
  userId: string,
  integration: { id: string; provider: string; syncStatus: string | null | undefined }
): Promise<SyncBlockResult> {
  if (integration.syncStatus !== 'SYNCING') {
    return { blocked: false }
  }

  const activelySyncing = await isProviderActivelySyncing(
    userId,
    integration.provider,
    integration.syncStatus
  )

  if (activelySyncing) {
    return { blocked: true, provider: integration.provider, reason: 'provider' }
  }

  await clearStaleSyncStatus(integration.id, integration.provider)
  return { blocked: false }
}

export async function resolveSyncAllBlock(userId: string): Promise<SyncBlockResult> {
  let batchRunning: boolean
  try {
    batchRunning = await isTaskRunningForUser('ingest-all', userId)
  } catch (error) {
    // Same fail-closed reasoning as isProviderActivelySyncing above: an
    // unconfirmed run status must not be treated as "safe to dispatch".
    console.warn('[SyncGuard] Unable to determine ingest-all run status; assuming active', error)
    batchRunning = true
  }

  if (batchRunning) {
    const syncingIntegration = await prisma.integration.findFirst({
      where: { userId, syncStatus: 'SYNCING' },
      select: { provider: true }
    })

    return {
      blocked: true,
      provider: syncingIntegration?.provider || 'all',
      reason: 'ingest-all'
    }
  }

  const syncingIntegrations = await prisma.integration.findMany({
    where: {
      userId,
      syncStatus: 'SYNCING'
    },
    select: { id: true, provider: true, syncStatus: true }
  })

  for (const integration of syncingIntegrations) {
    const result = await resolveProviderSyncBlock(userId, integration)
    if (result.blocked) {
      return result
    }
  }

  return { blocked: false }
}

export function formatSyncInProgressMessage(block: {
  provider: string
  reason: SyncBlockReason
}): string {
  if (block.reason === 'ingest-all') {
    return block.provider === 'all'
      ? 'A sync of all connected apps is already in progress. You can monitor it in the activity monitor.'
      : `A sync of all connected apps is already in progress (currently syncing ${block.provider}). You can monitor it in the activity monitor.`
  }

  return `${block.provider} sync is already in progress. Sync All will be available when it finishes, or sync other apps individually from Settings.`
}
