import { task, logger } from '@trigger.dev/sdk/v3'
import { prisma } from '../server/utils/db'
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
      endTimestamp = Math.floor(Date.now() / 1000)
      startTimestamp = endTimestamp - 86400
    }
    if (!endTimestamp) {
      endTimestamp = Math.floor(Date.now() / 1000)
    }

    logger.log(`Starting Garmin ingestion for user ${userId}`, { startTimestamp, endTimestamp })

    await prisma.integration.update({
      where: { id: integration.id },
      data: { syncStatus: 'SYNCING' }
    })

    try {
      const [dailies, sleeps, hrv, activities] = await Promise.all([
        fetchGarminDailies(integration, startTimestamp, endTimestamp),
        fetchGarminSleeps(integration, startTimestamp, endTimestamp),
        fetchGarminHRV(integration, startTimestamp, endTimestamp),
        fetchGarminActivities(integration, startTimestamp, endTimestamp)
      ])

      logger.log(`Fetched Garmin data`, {
        dailies: dailies.length,
        sleeps: sleeps.length,
        hrv: hrv.length,
        activities: activities.length
      })

      await GarminService.processWellness(userId, dailies)
      await GarminService.processSleep(userId, sleeps)
      await GarminService.processHRV(userId, hrv)
      await GarminService.processActivities(userId, activities, integration)

      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          syncStatus: 'SUCCESS',
          lastSyncAt: new Date(),
          errorMessage: null
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
