import { task, logger, wait } from '@trigger.dev/sdk/v3'
import { GarminService } from '../server/utils/services/garminService'
import { userIngestionQueue } from './queues'

export const garminBackfillTask = task({
  id: 'garmin-backfill',
  queue: userIngestionQueue,
  maxDuration: 900, // 15 minutes
  run: async (payload: { userId: string; delaySeconds?: number }) => {
    const { userId, delaySeconds = 30 } = payload

    if (delaySeconds > 0) {
      logger.log(`Waiting ${delaySeconds}s before starting Garmin backfill for user ${userId}...`)
      await wait.for({ seconds: delaySeconds })
    }

    logger.log(`Starting sequential Garmin backfill for user ${userId}`)

    try {
      await GarminService.startBackfill(userId)
      logger.log(`Garmin backfill requests completed for user ${userId}`)
      return { success: true }
    } catch (error) {
      logger.error(`Garmin backfill task failed for user ${userId}`, { error })
      throw error
    }
  }
})
