import { task, logger } from '@trigger.dev/sdk/v3'
import { prisma } from '../server/utils/db'
import { shouldIngestActivities, shouldIngestWellness } from '../server/utils/integration-settings'
import { GarminService } from '../server/utils/services/garminService'
import {
  fetchGarminDailies,
  fetchGarminSleeps,
  fetchGarminHRV,
  fetchGarminActivities
} from '../server/utils/garmin'
import { userIngestionQueue } from './queues'

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
    const { userId } = payload

    const integration = await prisma.integration.findUnique({
      where: { userId_provider: { userId, provider: 'garmin' } }
    })

    if (!integration) {
      logger.error(`Garmin integration not found for user ${userId}`)
      return
    }

    // Determine time range. Prefer timestamps, fall back to ISO strings, then to last 24h
    const now = Math.floor(Date.now() / 1000)
    let startTimestamp = payload.startTimestamp
    let endTimestamp = payload.endTimestamp

    if (!startTimestamp && payload.startDate) {
      startTimestamp = Math.floor(new Date(payload.startDate).getTime() / 1000)
    }
    if (!endTimestamp && payload.endDate) {
      endTimestamp = Math.floor(new Date(payload.endDate).getTime() / 1000)
    }

    // Default to last 24 hours if nothing provided
    if (!startTimestamp) {
      endTimestamp = endTimestamp || now - 60
      startTimestamp = endTimestamp - 86400
    }
    if (!endTimestamp) {
      endTimestamp = now - 60
    }

    // Ensure endTimestamp is not in the future (with a small buffer)
    if (endTimestamp > now - 60) {
      endTimestamp = now - 60
    }

    console.log(`[DEBUG] Garmin ingestion timestamps:`, {
      startTimestamp,
      endTimestamp,
      diff: endTimestamp - startTimestamp,
      isStartNan: isNaN(startTimestamp!),
      isEndNan: isNaN(endTimestamp!)
    })

    // Garmin Pull API enforces a strict 24-hour (86400s) maximum range.
    // If the requested range is larger, we clamp it to the last 24 hours of the range.
    if (endTimestamp - startTimestamp > 86400) {
      logger.warn(
        `Garmin requested range too large (${endTimestamp - startTimestamp}s). Clamping to 24 hours.`,
        {
          originalStart: startTimestamp,
          clampedStart: endTimestamp - 86400,
          end: endTimestamp
        }
      )
      startTimestamp = endTimestamp - 86400
    }

    logger.log(`Starting Garmin ingestion for user ${userId}`, { startTimestamp, endTimestamp })

    await prisma.integration.update({
      where: { id: integration.id },
      data: { syncStatus: 'SYNCING' }
    })

    try {
      const settings = (integration.settings as Record<string, any> | null) || {}
      const wellnessEnabled = shouldIngestWellness(settings)
      const workoutsEnabled = shouldIngestActivities('garmin', integration.ingestWorkouts, settings)

      const results = await Promise.allSettled([
        wellnessEnabled ? fetchGarminDailies(integration, startTimestamp, endTimestamp) : [],
        wellnessEnabled ? fetchGarminSleeps(integration, startTimestamp, endTimestamp) : [],
        wellnessEnabled ? fetchGarminHRV(integration, startTimestamp, endTimestamp) : [],
        workoutsEnabled ? fetchGarminActivities(integration, startTimestamp, endTimestamp) : []
      ])

      const dailies = results[0].status === 'fulfilled' ? results[0].value : []
      const sleeps = results[1].status === 'fulfilled' ? results[1].value : []
      const hrv = results[2].status === 'fulfilled' ? results[2].value : []
      const activities = results[3].status === 'fulfilled' ? results[3].value : []

      // Log errors for failed requests
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const types = ['dailies', 'sleeps', 'hrv', 'activities']
          const type = types[index]
          const error = result.reason

          console.error(`[DEBUG] Garmin fetch failed for ${type}:`, error)
          logger.error(`Failed to fetch Garmin ${type}`, { error })
        }
      })

      logger.log(`Fetched Garmin data`, {
        dailies: dailies.length,
        sleeps: sleeps.length,
        hrv: hrv.length,
        activities: activities.length
      })

      if (dailies.length > 0) await GarminService.processWellness(userId, dailies)
      if (sleeps.length > 0) await GarminService.processSleep(userId, sleeps)
      if (hrv.length > 0) await GarminService.processHRV(userId, hrv)
      if (activities.length > 0)
        await GarminService.processActivities(userId, activities, integration)

      // If all failed, we should still consider it an error
      if (results.every((r) => r.status === 'rejected')) {
        console.error('[DEBUG] All Garmin API requests failed for user:', userId)
        throw new Error('All Garmin API requests failed')
      }

      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          syncStatus: 'SUCCESS',
          lastSyncAt: new Date(),
          errorMessage: results.some((r) => r.status === 'rejected')
            ? 'Some data types failed to sync. Check logs for details.'
            : null
        }
      })

      return {
        success: true,
        counts: {
          dailies: dailies.length,
          sleeps: sleeps.length,
          hrv: hrv.length,
          activities: activities.length
        }
      }
    } catch (error) {
      logger.error(`Garmin ingestion failed`, { error })

      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          syncStatus: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      throw error
    }
  }
})

// Alias for webhook handler consistency if needed
export const ingestGarminWellnessTask = ingestGarminTask
