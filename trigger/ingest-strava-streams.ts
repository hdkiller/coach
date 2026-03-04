import './init'
import { task, logger } from '@trigger.dev/sdk/v3'
import { userIngestionQueue } from './queues'
import { prisma } from '../server/utils/db'
import { shouldIngestActivities } from '../server/utils/integration-settings'
import { ingestStravaStreamsForWorkout } from './utils/strava-stream-ingestion'

interface IngestStreamsPayload {
  userId: string
  workoutId: string
  activityId: number
}

export const ingestStravaStreams = task({
  id: 'ingest-strava-streams',
  queue: userIngestionQueue,
  maxDuration: 900, // 15 minutes
  run: async (payload: IngestStreamsPayload) => {
    logger.log('Starting stream ingestion', {
      workoutId: payload.workoutId,
      activityId: payload.activityId
    })

    // Block ingestion on hosted site until Strava app is approved
    const stravaEnabled = process.env.NUXT_PUBLIC_STRAVA_ENABLED !== 'false'
    if (!stravaEnabled) {
      logger.log('Strava ingestion is temporarily disabled via environment variable')
      return {
        success: false,
        message: 'Strava integration is temporarily disabled'
      }
    }

    // Get Strava integration
    const integration = await prisma.integration.findFirst({
      where: {
        userId: payload.userId,
        provider: 'strava'
      }
    })

    if (!integration) {
      throw new Error('Strava integration not found')
    }

    if (
      !shouldIngestActivities(
        'strava',
        integration.ingestWorkouts,
        (integration.settings as Record<string, any> | null) || {}
      )
    ) {
      return {
        success: true,
        skipped: true,
        reason: 'ingestion_disabled'
      }
    }

    const result = await ingestStravaStreamsForWorkout({
      userId: payload.userId,
      workoutId: payload.workoutId,
      activityId: payload.activityId,
      integration
    })

    return {
      success: true,
      ...result
    }
  }
})
