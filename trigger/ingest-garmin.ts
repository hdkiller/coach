import { task, logger } from '@trigger.dev/sdk/v3'
import { GarminService } from '../server/utils/services/garminService'
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
    logger.log('Starting Garmin ingestion via Trigger.dev', { userId: payload.userId })
    return await GarminService.runIngestGarmin(payload)
  }
})

// Alias for webhook handler consistency
export const ingestGarminWellnessTask = ingestGarminTask
