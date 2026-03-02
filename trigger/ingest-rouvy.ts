import './init'
import { logger, task, tasks } from '@trigger.dev/sdk/v3'
import { userIngestionQueue } from './queues'
import { fetchRouvyActivities, normalizeRouvyActivity } from '../server/utils/rouvy'
import { prisma } from '../server/utils/db'
import { workoutRepository } from '../server/utils/repositories/workoutRepository'
import { calculateWorkoutStress } from '../server/utils/calculate-workout-stress'
import type { IngestionResult } from './types'

export const ingestRouvyTask = task({
  id: 'ingest-rouvy',
  queue: userIngestionQueue,
  maxDuration: 900, // 15 minutes
  run: async (payload: {
    userId: string
    startDate: string
    endDate: string
  }): Promise<IngestionResult> => {
    const { userId, startDate, endDate } = payload

    logger.log('Starting ROUVY ingestion', { userId, startDate, endDate })

    const integration = await prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'rouvy'
        }
      }
    })

    if (!integration) {
      throw new Error('ROUVY integration not found for user')
    }

    await prisma.integration.update({
      where: { id: integration.id },
      data: { syncStatus: 'SYNCING' }
    })

    try {
      logger.log('Fetching activities from ROUVY...')
      // ROUVY API expects ISO format or similar
      const activities = await fetchRouvyActivities(integration, startDate, endDate)
      logger.log(`Fetched ${activities.length} activity summaries from ROUVY`)

      let workoutsUpserted = 0
      let workoutsSkipped = 0

      for (const activity of activities) {
        // Check if this activity already exists from other high-priority sources (e.g. FIT file upload)
        const activityDate = new Date(activity.startDateUTC)
        const fiveMinutesBefore = new Date(activityDate.getTime() - 5 * 60 * 1000)
        const fiveMinutesAfter = new Date(activityDate.getTime() + 5 * 60 * 1000)

        const existingHighPriority = await prisma.workout.findFirst({
          where: {
            userId,
            source: { in: ['fit_file', 'intervals'] },
            date: {
              gte: fiveMinutesBefore,
              lte: fiveMinutesAfter
            },
            durationSec: {
              gte: activity.movingTimeSeconds - 60,
              lte: activity.movingTimeSeconds + 60
            }
          }
        })

        if (existingHighPriority) {
          logger.log(
            `Skipping ROUVY activity ${activity.activityId} - already exists from high priority source (${existingHighPriority.source}: ${existingHighPriority.id})`
          )
          workoutsSkipped++
          continue
        }

        const workout = normalizeRouvyActivity(activity, userId)

        const { isNew, record: upsertedWorkout } = await workoutRepository.upsert(
          userId,
          'rouvy',
          workout.externalId,
          workout as any,
          workout as any
        )

        if (isNew) {
          workoutsUpserted++
        }

        // Calculate CTL/ATL for the workout
        try {
          await calculateWorkoutStress(upsertedWorkout.id, userId)
        } catch (error) {
          logger.error(`Failed to calculate workout stress for ${upsertedWorkout.id}:`, { error })
        }

        // Trigger FIT file ingestion for ROUVY activities to get high-res data
        logger.log(`Triggering FIT file ingestion for ROUVY activity: ${activity.activityId}`)
        await tasks.trigger(
          'ingest-rouvy-fit',
          {
            userId,
            workoutId: upsertedWorkout.id,
            activityId: activity.activityId
          },
          {
            concurrencyKey: userId,
            tags: [`user:${userId}`]
          }
        )
      }

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
      logger.error('Error ingesting ROUVY data', { error })

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
