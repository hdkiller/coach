import './init'
import { logger, task } from '@trigger.dev/sdk/v3'
import { userIngestionQueue } from './queues'
import { ingestRouvyFitFile } from '../server/utils/services/rouvyService'

export const ingestRouvyFitTask = task({
  id: 'ingest-rouvy-fit',
  queue: userIngestionQueue,
  maxDuration: 600,
  run: async (payload: { userId: string; workoutId: string; activityId: string }) => {
    logger.log('Starting ROUVY FIT file ingestion', payload)
    return await ingestRouvyFitFile(payload)
  }
})
