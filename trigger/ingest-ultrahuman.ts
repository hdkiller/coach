import './init'
import { logger, task } from '@trigger.dev/sdk/v3'
import { userIngestionQueue } from './queues'
import { fetchUltrahumanDaily, normalizeUltrahumanWellness } from '../server/utils/ultrahuman'
import { prisma } from '../server/utils/db'
import { shouldIngestWellness } from '../server/utils/integration-settings'
import { wellnessRepository } from '../server/utils/repositories/wellnessRepository'
import type { IngestionResult } from './types'

export const ingestUltrahumanTask = task({
  id: 'ingest-ultrahuman',
  queue: userIngestionQueue,
  maxDuration: 900, // 15 minutes
  run: async (payload: {
    userId: string
    startDate: string
    endDate: string
  }): Promise<IngestionResult> => {
    const { userId, startDate, endDate } = payload

    logger.log('[Ultrahuman Ingest] Starting ingestion', {
      userId,
      startDate,
      endDate
    })

    // Fetch integration
    const integration = await prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'ultrahuman'
        }
      }
    })

    if (!integration) {
      throw new Error('Ultrahuman integration not found for user')
    }

    // Update sync status
    await prisma.integration.update({
      where: { id: integration.id },
      data: { syncStatus: 'SYNCING' }
    })

    try {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const settings = (integration.settings as Record<string, any> | null) || {}
      const wellnessEnabled = shouldIngestWellness(settings)

      if (!wellnessEnabled) {
        logger.log('[Ultrahuman Ingest] Wellness Disabled - Skipping')
        return {
          success: true,
          counts: { wellness: 0, workouts: 0 },
          skipped: 0,
          userId,
          startDate,
          endDate
        }
      }

      let wellnessUpsertCount = 0
      let wellnessSkippedCount = 0

      // Ultrahuman API works on a per-day basis
      // Iterate through the date range
      const currentDate = new Date(start)
      while (currentDate <= end) {
        const utcDate = new Date(
          Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
        )

        logger.log(`[Ultrahuman Ingest] Fetching data for ${utcDate.toISOString().split('T')[0]}`)

        const dailyData = await fetchUltrahumanDaily(integration, utcDate)

        const wellness = normalizeUltrahumanWellness(dailyData, userId, utcDate)

        if (!wellness) {
          wellnessSkippedCount++
        } else {
          await wellnessRepository.upsert(
            userId,
            wellness.date,
            wellness as any,
            wellness as any,
            'ultrahuman'
          )
          wellnessUpsertCount++
        }

        // Advance to next day
        currentDate.setDate(currentDate.getDate() + 1)
      }

      logger.log(
        `[Ultrahuman Ingest] Wellness Complete - Saved: ${wellnessUpsertCount}, Skipped: ${wellnessSkippedCount}`
      )

      // Update sync status
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
          wellness: wellnessUpsertCount,
          workouts: 0 // Ultrahuman doesn't provide discrete workouts in this API yet
        },
        skipped: wellnessSkippedCount,
        userId,
        startDate,
        endDate
      }
    } catch (error) {
      logger.error('[Ultrahuman Ingest] Error ingesting data', { error })
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
