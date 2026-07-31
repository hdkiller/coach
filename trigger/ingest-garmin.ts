import { task, logger } from '@trigger.dev/sdk/v3'
import { prisma } from '../server/utils/db'
import { GarminService } from '../server/utils/services/garminService'
import { userIngestionQueue } from './queues'

// CW-90: Garmin partner guidance treats Push/Ping as the primary realtime
// delivery channel; ad-hoc pull exists only to recover from a missed or
// delayed push, never as a routine/primary sync path. This task is the one
// choke point every ad-hoc Garmin pull passes through — both the per-provider
// "Sync" button (server/api/integrations/sync.post.ts, which also enforces
// the cooldown at the HTTP layer for immediate user feedback) and the
// "Sync All" batch path (trigger/ingest-all.ts, which has no per-provider
// guard of its own) funnel here. Two guards below enforce the recovery-only
// role at this level so neither entry point can bypass it:
//   1. A cooldown since the last successful sync — an ad-hoc pull that
//      fires again moments later isn't "recovering" from anything.
//   2. A bounded lookback window — never fetch further back than a few
//      days, no matter what the caller requests.
// Keep these constants in sync with the mirrored copies in sync.post.ts.
// See docs/01-architecture/system-overview.md#garmin-push-first-policy.
const GARMIN_ADHOC_MIN_INTERVAL_MS = 15 * 60 * 1000 // 15 minutes
const GARMIN_ADHOC_MAX_LOOKBACK_SECONDS = 3 * 24 * 60 * 60 // 3 days

export const ingestGarminTask = task({
  id: 'ingest-garmin',
  queue: userIngestionQueue,
  maxDuration: 600, // 10 minutes
  run: async (payload: {
    userId: string
    startDate?: string
    endDate?: string
    startTimestamp?: number
    endTimestamp?: number
    manualSync?: boolean
  }) => {
    const integration = await prisma.integration.findUnique({
      where: { userId_provider: { userId: payload.userId, provider: 'garmin' } },
      select: { lastSyncAt: true }
    })

    if (integration?.lastSyncAt) {
      const elapsedMs = Date.now() - new Date(integration.lastSyncAt).getTime()
      if (elapsedMs < GARMIN_ADHOC_MIN_INTERVAL_MS) {
        logger.log(
          'Skipping Garmin ad-hoc pull — within recovery cooldown of the last successful sync',
          { userId: payload.userId, elapsedMs, cooldownMs: GARMIN_ADHOC_MIN_INTERVAL_MS }
        )
        return {
          success: true,
          skipped: true,
          reason: 'cooldown',
          counts: { dailies: 0, sleeps: 0, hrv: 0, bodyComps: 0, userMetrics: 0, activities: 0 }
        }
      }
    }

    const nowSeconds = Math.floor(Date.now() / 1000)
    const earliestAllowedStart = nowSeconds - GARMIN_ADHOC_MAX_LOOKBACK_SECONDS

    let startTimestamp = payload.startTimestamp
    let startDate = payload.startDate

    if (typeof startTimestamp === 'number' && startTimestamp < earliestAllowedStart) {
      startTimestamp = earliestAllowedStart
    }
    if (startDate) {
      const parsedSeconds = Math.floor(new Date(startDate).getTime() / 1000)
      if (Number.isFinite(parsedSeconds) && parsedSeconds < earliestAllowedStart) {
        startDate = new Date(earliestAllowedStart * 1000).toISOString()
      }
    }

    logger.log('Starting Garmin ingestion via Trigger.dev', { userId: payload.userId })
    return await GarminService.runIngestGarmin({
      ...payload,
      startDate,
      startTimestamp
    })
  }
})

// Alias for webhook handler consistency
export const ingestGarminWellnessTask = ingestGarminTask
