import './init'
import { logger, task, tasks } from '@trigger.dev/sdk/v3'
import { userIngestionQueue } from './queues'
import { fetchStravaActivityDetails, normalizeStravaActivity } from '../server/utils/strava'
import { prisma } from '../server/utils/db'
import { workoutRepository } from '../server/utils/repositories/workoutRepository'
import { calculateWorkoutStress } from '../server/utils/calculate-workout-stress'
import { getUserTimezone, getUserLocalDate } from '../server/utils/date'
import { isNutritionTrackingEnabled } from '../server/utils/nutrition/feature'
import { metabolicService } from '../server/utils/services/metabolicService'

export const ingestStravaActivityTask = task({
  id: 'ingest-strava-activity',
  queue: userIngestionQueue,
  maxDuration: 300, // 5 minutes
  run: async (payload: { userId: string; activityId: number; isUpdate?: boolean }) => {
    const { userId, activityId, isUpdate = false } = payload

    logger.log('Starting Strava activity ingestion', { userId, activityId, isUpdate })

    // Block ingestion on hosted site until Strava app is approved
    const stravaEnabled = process.env.NUXT_PUBLIC_STRAVA_ENABLED !== 'false'
    if (!stravaEnabled) {
      logger.log('Strava ingestion is temporarily disabled via environment variable')
      return {
        success: false,
        message: 'Strava integration is temporarily disabled'
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

    try {
      logger.log(`Fetching details for Strava activity ${activityId}...`)
      const detailedActivity = await fetchStravaActivityDetails(integration, activityId)

      // Check if this activity already exists from Intervals.icu to avoid duplicates
      // We check this even for updates to be safe
      const activityDate = new Date(detailedActivity.start_date)
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
            gte: detailedActivity.moving_time - 30,
            lte: detailedActivity.moving_time + 30
          }
        }
      })

      if (existingFromIntervals) {
        logger.log(
          `Skipping Strava activity ${activityId} - already exists from Intervals.icu (workout ${existingFromIntervals.id})`
        )
        return { success: true, skipped: true, reason: 'exists_in_intervals' }
      }

      const workout = normalizeStravaActivity(detailedActivity, userId)

      const { isNew, record: upsertedWorkout } = await workoutRepository.upsert(
        userId,
        'strava',
        workout.externalId,
        workout as any,
        workout as any
      )

      logger.log(`Successfully ${isNew ? 'created' : 'updated'} workout ${upsertedWorkout.id}`)

      // Calculate stress metrics
      try {
        await calculateWorkoutStress(upsertedWorkout.id, userId)
      } catch (error) {
        logger.error(`Failed to calculate workout stress for ${upsertedWorkout.id}:`, { error })
      }

      // Trigger stream ingestion
      logger.log(
        `Triggering stream ingestion for ${upsertedWorkout.type} workout: ${upsertedWorkout.id}`
      )
      await tasks.trigger(
        'ingest-strava-streams',
        {
          userId,
          workoutId: upsertedWorkout.id,
          activityId: activityId
        },
        {
          concurrencyKey: userId,
          tags: [`user:${userId}`]
        }
      )

      // REACTIVE: Trigger fueling plan update for the workout date
      try {
        if (await isNutritionTrackingEnabled(userId)) {
          const timezone = await getUserTimezone(userId)
          // Use the workout date in user's timezone
          const workoutLocalDate = timezone
            ? getUserLocalDate(timezone, upsertedWorkout.date)
            : upsertedWorkout.date
          await metabolicService.calculateFuelingPlanForDate(userId, workoutLocalDate, {
            persist: true
          })
        }
      } catch (err) {
        logger.error('Failed to trigger fueling plan update', { err })
      }

      return {
        success: true,
        workoutId: upsertedWorkout.id,
        isNew
      }
    } catch (error) {
      logger.error('Error ingesting Strava activity', { error })
      throw error
    }
  }
})
