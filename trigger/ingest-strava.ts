import './init'
import { logger, task, tasks } from '@trigger.dev/sdk/v3'
import { userIngestionQueue } from './queues'
import {
  fetchStravaActivities,
  fetchStravaActivityDetails,
  normalizeStravaActivity
} from '../server/utils/strava'
import { prisma } from '../server/utils/db'
import { shouldIngestActivities } from '../server/utils/integration-settings'
import { workoutRepository } from '../server/utils/repositories/workoutRepository'
import { calculateWorkoutStress } from '../server/utils/calculate-workout-stress'
import type { IngestionResult } from './types'
import { ingestStravaStreamsForWorkout } from './utils/strava-stream-ingestion'
import { linkWorkoutToMatchingPlannedWorkout } from '../server/utils/planned-workout-linking'

function buildStravaStreamRepairTrigger(userId: string, workoutId: string, activityId: number) {
  return tasks.trigger(
    'ingest-strava-streams',
    {
      userId,
      workoutId,
      activityId
    },
    {
      concurrencyKey: userId,
      tags: [`user:${userId}`],
      idempotencyKey: `strava-streams:${userId}:${activityId}`,
      idempotencyKeyTTL: '1h'
    }
  )
}

export const ingestStravaTask = task({
  id: 'ingest-strava',
  queue: userIngestionQueue,
  maxDuration: 1800, // 30 minutes
  run: async (payload: {
    userId: string
    startDate: string
    endDate: string
  }): Promise<IngestionResult> => {
    const { userId, startDate, endDate } = payload

    logger.log('Starting Strava ingestion', { userId, startDate, endDate })

    // Block ingestion on hosted site until Strava app is approved
    const stravaEnabled = process.env.NUXT_PUBLIC_STRAVA_ENABLED !== 'false'
    if (!stravaEnabled) {
      logger.log('Strava ingestion is temporarily disabled via environment variable')
      return {
        success: false,
        message: 'Strava integration is temporarily disabled',
        counts: {}
      }
    }

    const integration = await prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'strava'
        }
      }
    })

    if (!integration) {
      throw new Error('Strava integration not found for user')
    }

    await prisma.integration.update({
      where: { id: integration.id },
      data: { syncStatus: 'SYNCING' }
    })

    try {
      const settings = (integration.settings as Record<string, any> | null) || {}
      if (!shouldIngestActivities('strava', integration.ingestWorkouts, settings)) {
        logger.log('Strava activity ingestion disabled - skipping')
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
            workouts: 0
          },
          userId,
          startDate,
          endDate
        }
      }

      const start = new Date(startDate)
      const end = new Date(endDate)

      logger.log('Fetching activities from Strava...')
      const activities = await fetchStravaActivities(integration, start, end)
      logger.log(`Fetched ${activities.length} activity summaries from Strava`)

      // Re-fetch integration to get any updated tokens from the activities fetch
      const updatedIntegration = await prisma.integration.findUnique({
        where: { id: integration.id }
      })

      if (!updatedIntegration) {
        throw new Error('Integration not found after activities fetch')
      }

      let workoutsUpserted = 0
      let workoutsSkipped = 0
      let detailsFetched = 0
      const queuedRepairWorkoutIds = new Set<string>()

      for (const activity of activities) {
        // Check if this activity already exists from Intervals.icu
        // Match by date (within 5 minutes), type, and duration (within 30 seconds)
        // ALWAYS use start_date (UTC) for matching absolute time points
        const activityDate = new Date(activity.start_date)
        const fiveMinutesBefore = new Date(activityDate.getTime() - 5 * 60 * 1000)
        const fiveMinutesAfter = new Date(activityDate.getTime() + 5 * 60 * 1000)

        const existingFromIntervals = await prisma.workout.findFirst({
          where: {
            userId,
            source: 'intervals',
            date: {
              gte: fiveMinutesBefore,
              lte: fiveMinutesAfter
            },
            durationSec: {
              gte: activity.moving_time - 30,
              lte: activity.moving_time + 30
            }
          }
        })

        if (existingFromIntervals) {
          logger.log(
            `Skipping Strava activity ${activity.id} - already exists from Intervals.icu (workout ${existingFromIntervals.id})`
          )
          workoutsSkipped++
          continue
        }

        // Check if this exact Strava activity already exists and is up-to-date
        const existingStrava = await workoutRepository.getByExternalId(
          userId,
          'strava',
          String(activity.id)
        )

        // If activity exists and hasn't been updated on Strava, skip detail fetch
        const stravaUpdatedAt = new Date(activity.updated_at || activity.start_date)
        if (
          existingStrava &&
          existingStrava.updatedAt &&
          existingStrava.updatedAt >= stravaUpdatedAt
        ) {
          logger.log(`Skipping Strava activity ${activity.id} - already up-to-date in database`)
          workoutsSkipped++
          continue
        }

        // Only fetch detailed activity data for new or updated activities
        logger.log(`Fetching details for activity ${activity.id}...`)
        const detailedActivity = await fetchStravaActivityDetails(updatedIntegration, activity.id)
        detailsFetched++

        const workout = normalizeStravaActivity(detailedActivity, userId)

        const { isNew, record: upsertedWorkout } = await workoutRepository.upsert(
          userId,
          'strava',
          workout.externalId,
          workout as any,
          workout as any
        )

        if (isNew) {
          workoutsUpserted++
        }

        try {
          const linkResult = await linkWorkoutToMatchingPlannedWorkout(upsertedWorkout)
          if (linkResult.linked) {
            logger.log('Linked Strava workout to matching planned workout', {
              workoutId: upsertedWorkout.id,
              plannedWorkoutId: linkResult.plannedWorkoutId
            })
          }
        } catch (error) {
          logger.error('Failed to link Strava workout to matching planned workout', {
            workoutId: upsertedWorkout.id,
            error
          })
        }

        try {
          const streamIntegration =
            (await prisma.integration.findUnique({
              where: { id: updatedIntegration.id }
            })) || updatedIntegration

          await ingestStravaStreamsForWorkout({
            userId,
            workoutId: upsertedWorkout.id,
            activityId: activity.id,
            integration: streamIntegration
          })
        } catch (error) {
          logger.error(`Failed to ingest streams for ${upsertedWorkout.id}:`, { error })

          try {
            await calculateWorkoutStress(upsertedWorkout.id, userId)
          } catch (stressError) {
            logger.error(`Failed to calculate fallback stress for ${upsertedWorkout.id}:`, {
              error: stressError
            })
          }

          await buildStravaStreamRepairTrigger(userId, upsertedWorkout.id, activity.id)
          queuedRepairWorkoutIds.add(upsertedWorkout.id)
        }

        // Add a small delay to avoid rate limiting (Strava allows 100 requests per 15 minutes)
        // With 7-day sync window, we expect ~7-14 activities max, well under rate limits
        if (detailsFetched % 5 === 0) {
          logger.log(
            `Processed ${workoutsUpserted}/${activities.length} activities (${detailsFetched} detail fetches), pausing briefly...`
          )
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }

      logger.log('Checking for recent workouts missing streams...')
      const workoutsMissingStreams = await prisma.workout.findMany({
        where: {
          userId,
          source: 'strava',
          streams: null,
          id: { notIn: Array.from(queuedRepairWorkoutIds) }
        },
        orderBy: {
          date: 'desc'
        },
        take: 5
      })

      if (workoutsMissingStreams.length > 0) {
        logger.log(
          `Found ${workoutsMissingStreams.length} recent workouts missing streams. Triggering ingestion...`
        )

        for (const workout of workoutsMissingStreams) {
          // Verify we have a valid Strava ID
          const activityId = parseInt(workout.externalId)
          if (isNaN(activityId)) {
            logger.log(
              `Skipping backfill for workout ${workout.id} - invalid externalId: ${workout.externalId}`
            )
            continue
          }

          logger.log(
            `Triggering backfill stream ingestion for workout ${workout.id} (Strava ID: ${activityId})`
          )

          await buildStravaStreamRepairTrigger(userId, workout.id, activityId)

          // Small delay to be safe
          await new Promise((resolve) => setTimeout(resolve, 200))
        }
      } else {
        logger.log('No recent workouts found missing streams.')
      }

      logger.log(
        `Strava sync complete: ${workoutsUpserted} upserted, ${workoutsSkipped} skipped, ${detailsFetched} detail API calls made`
      )

      logger.log(`Upserted ${workoutsUpserted} workouts from Strava`)

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
          workouts: workoutsUpserted
        },
        skipped: workoutsSkipped,
        userId,
        startDate,
        endDate
      }
    } catch (error) {
      logger.error('Error ingesting Strava data', { error })

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
