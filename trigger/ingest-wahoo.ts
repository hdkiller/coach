import './init'
import { logger, task, tasks } from '@trigger.dev/sdk/v3'
import { userIngestionQueue } from './queues'
import { fetchWahooWorkouts, normalizeWahooWorkout } from '../server/utils/wahoo'
import { prisma } from '../server/utils/db'
import { workoutRepository } from '../server/utils/repositories/workoutRepository'
import { calculateWorkoutStress } from '../server/utils/calculate-workout-stress'
import type { IngestionResult } from './types'
import crypto from 'crypto'

export const ingestWahooTask = task({
  id: 'ingest-wahoo',
  queue: userIngestionQueue,
  maxDuration: 900, // 15 minutes
  run: async (payload: {
    userId: string
    startDate: string
    endDate: string
  }): Promise<IngestionResult> => {
    const { userId, startDate, endDate } = payload

    logger.log('Starting Wahoo ingestion', { userId, startDate, endDate })

    const integration = await prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'wahoo'
        }
      }
    })

    if (!integration) {
      throw new Error('Wahoo integration not found for user')
    }

    await prisma.integration.update({
      where: { id: integration.id },
      data: { syncStatus: 'SYNCING' }
    })

    try {
      logger.log('Fetching workouts from Wahoo...')
      // Wahoo Cloud API returns descending by default.
      // We might need to handle pagination if there are many workouts.
      const { workouts, total } = await fetchWahooWorkouts(integration, 1, 100)
      logger.log(`Fetched ${workouts.length} workouts from Wahoo (Total available: ${total})`)

      const start = new Date(startDate)
      const end = new Date(endDate)

      let workoutsUpserted = 0
      let workoutsSkipped = 0
      let fitFilesTriggered = 0

      for (const workout of workouts) {
        const workoutDate = new Date(workout.starts)

        // Filter by date range
        if (workoutDate < start || workoutDate > end) {
          continue
        }

        // Check if this activity already exists from Intervals.icu
        // Match by date (within 5 minutes) and duration (within 60 seconds)
        const fiveMinutesBefore = new Date(workoutDate.getTime() - 5 * 60 * 1000)
        const fiveMinutesAfter = new Date(workoutDate.getTime() + 5 * 60 * 1000)

        const existingFromIntervals = await prisma.workout.findFirst({
          where: {
            userId,
            source: 'intervals',
            date: {
              gte: fiveMinutesBefore,
              lte: fiveMinutesAfter
            },
            durationSec: {
              gte: Math.round(workout.minutes * 60) - 60,
              lte: Math.round(workout.minutes * 60) + 60
            }
          }
        })

        if (existingFromIntervals) {
          logger.log(
            `Skipping Wahoo workout ${workout.id} - already exists from Intervals.icu (workout ${existingFromIntervals.id})`
          )
          workoutsSkipped++
          continue
        }

        // Check if we should process the FIT file
        if (workout.workout_summary?.file?.url) {
          logger.log(`Found FIT file for Wahoo workout ${workout.id}, downloading...`)

          try {
            const fileResponse = await fetch(workout.workout_summary.file.url)
            if (!fileResponse.ok) {
              throw new Error(`Failed to download FIT file: ${fileResponse.statusText}`)
            }

            const arrayBuffer = await fileResponse.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)

            // Calculate hash to avoid duplicates
            const hash = crypto.createHash('sha256').update(buffer).digest('hex')
            const filename = `wahoo_${workout.id}.fit`

            // Store in FitFile table
            const fitFile = await prisma.fitFile.upsert({
              where: { hash },
              update: {
                userId,
                filename,
                fileData: buffer
              },
              create: {
                userId,
                filename,
                fileData: buffer,
                hash
              }
            })

            logger.log(`Saved FIT file to database, triggering ingestion task...`)

            // Trigger ingest-fit-file which will handle detailed streams and stress calculation
            await tasks.trigger(
              'ingest-fit-file',
              {
                userId,
                fitFileId: fitFile.id,
                source: 'wahoo',
                externalId: String(workout.id),
                rawJson: workout
              },
              {
                concurrencyKey: userId,
                tags: [`user:${userId}`]
              }
            )

            fitFilesTriggered++
            workoutsUpserted++ // Count it as upserted since we triggered the process
            continue // Skip the basic normalization if we have a FIT file
          } catch (error) {
            logger.error(
              `Failed to process FIT file for workout ${workout.id}, falling back to summary`,
              { error }
            )
          }
        }

        // Fallback: process with summary only (no FIT file or download failed)
        const normalized = normalizeWahooWorkout(workout, userId)

        const { isNew, record: upsertedWorkout } = await workoutRepository.upsert(
          userId,
          'wahoo',
          normalized.externalId,
          normalized as any,
          normalized as any
        )

        if (isNew) {
          workoutsUpserted++
        }

        // Calculate stress for the summary-only workout
        try {
          await calculateWorkoutStress(upsertedWorkout.id, userId)
        } catch (error) {
          logger.error(`Failed to calculate workout stress for ${upsertedWorkout.id}:`, { error })
        }
      }

      logger.log(
        `Wahoo sync complete: ${workoutsUpserted} processed (${fitFilesTriggered} via FIT file), ${workoutsSkipped} skipped`
      )

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
          workouts: workoutsUpserted,
          fitFiles: fitFilesTriggered
        },
        skipped: workoutsSkipped,
        userId,
        startDate,
        endDate
      }
    } catch (error) {
      logger.error('Error ingesting Wahoo data', { error })

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
