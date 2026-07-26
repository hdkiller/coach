import './init'
import { logger, task } from '@trigger.dev/sdk/v3'
import { userReportsQueue } from './queues'
import {
  runGenerateDailyCheckin,
  type GenerateDailyCheckinPayload
} from '../server/utils/services/checkin-service'

export { type GenerateDailyCheckinPayload }

export const generateDailyCheckinTask = task({
  id: 'generate-daily-checkin',
  maxDuration: 300,
  queue: userReportsQueue,
  run: async (payload: GenerateDailyCheckinPayload) => {
    logger.log('Generating daily check-in via Trigger.dev', {
      userId: payload.userId,
      date: payload.date
    })
    return await runGenerateDailyCheckin(payload)
  }
})
