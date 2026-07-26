import './init'
import { logger, task } from '@trigger.dev/sdk/v3'
import { userIngestionQueue } from './queues'
import type { IngestionResult } from './types'
import { runIngestStrava } from '../server/utils/services/stravaService'

export const ingestStravaTask = task({
  id: 'ingest-strava',
  queue: userIngestionQueue,
  maxDuration: 1800, // 30 minutes
  run: async (payload: {
    userId: string
    startDate: string
    endDate: string
  }): Promise<IngestionResult> => {
    logger.log('Starting Strava ingestion via Trigger.dev', {
      userId: payload.userId,
      startDate: payload.startDate,
      endDate: payload.endDate
    })
    return await runIngestStrava(payload)
  }
})
