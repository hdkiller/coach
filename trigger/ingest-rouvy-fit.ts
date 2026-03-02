import './init'
import { logger, task } from '@trigger.dev/sdk/v3'
import { userIngestionQueue } from './queues'
import { prisma } from '../server/utils/db'
import { fetchRouvyActivityFitFile } from '../server/utils/rouvy'
import {
  parseFitFile,
  normalizeFitSession,
  extractFitStreams,
  reconstructSessionFromRecords,
  extractFitExtrasMeta
} from '../server/utils/fit'
import { calculateWorkoutStress } from '../server/utils/calculate-workout-stress'
import {
  calculateLapSplits,
  calculatePaceVariability,
  calculateAveragePace,
  analyzePacingStrategy,
  detectSurges
} from '../server/utils/pacing'
import { workoutRepository } from '../server/utils/repositories/workoutRepository'

export const ingestRouvyFitTask = task({
  id: 'ingest-rouvy-fit',
  queue: userIngestionQueue,
  maxDuration: 600,
  run: async (payload: { userId: string; workoutId: string; activityId: string }) => {
    const { userId, workoutId, activityId } = payload

    logger.log('Starting ROUVY FIT file ingestion', { userId, workoutId, activityId })

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

    try {
      logger.log(`Fetching FIT file for ROUVY activity ${activityId}...`)
      const fitBuffer = await fetchRouvyActivityFitFile(integration, activityId)

      // Parse file content
      logger.log(`Parsing FIT file from ROUVY...`)
      const fitData = await parseFitFile(fitBuffer)

      // Get main session
      let session = fitData.sessions[0]
      if (!session) {
        if (fitData.records && fitData.records.length > 0) {
          logger.log('No session data found in FIT file, attempting to reconstruct from records')
          session = reconstructSessionFromRecords(fitData.records)
        }
      }

      if (!session) {
        throw new Error('No session data found in FIT file and could not reconstruct from records')
      }

      // Normalize to workout
      logger.log('Normalizing session data...')
      const workoutData = normalizeFitSession(session, userId, `rouvy_${activityId}.fit`)

      // Extract streams
      logger.log('Extracting and saving streams...')
      const streams = extractFitStreams(fitData.records)
      const extrasMeta = extractFitExtrasMeta(fitData)

      // Calculate pacing metrics
      let lapSplits = null
      let paceVariability = null
      let avgPacePerKm = null
      let pacingStrategy = null
      let surges = null

      const timeData = streams.time || []
      const distanceData = streams.distance || []
      const velocityData = streams.velocity || []

      if (timeData.length > 0 && distanceData.length > 0) {
        lapSplits = calculateLapSplits(timeData, distanceData, 1000)
        if (velocityData.length > 0) {
          paceVariability = calculatePaceVariability(velocityData)
          avgPacePerKm = calculateAveragePace(
            timeData[timeData.length - 1],
            distanceData[distanceData.length - 1]
          )
        }
        if (lapSplits && lapSplits.length >= 2) {
          pacingStrategy = analyzePacingStrategy(lapSplits)
        }
        if (velocityData.length > 20 && timeData.length > 20) {
          surges = detectSurges(velocityData, timeData)
        }
      }

      // Update workout with detailed data from FIT
      await workoutRepository.update(workoutId, {
        ...workoutData,
        source: 'rouvy' // Ensure source stays rouvy
      })

      // Save streams
      await prisma.workoutStream.upsert({
        where: { workoutId },
        create: {
          workoutId,
          ...streams,
          extrasMeta,
          lapSplits,
          paceVariability,
          avgPacePerKm,
          pacingStrategy,
          surges
        },
        update: {
          ...streams,
          extrasMeta,
          lapSplits,
          paceVariability,
          avgPacePerKm,
          pacingStrategy,
          surges
        }
      })

      // Save FIT file to DB for backup/future use
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', fitBuffer)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')

      await prisma.fitFile.upsert({
        where: { workoutId },
        create: {
          userId,
          workoutId,
          filename: `rouvy_${activityId}.fit`,
          fileData: fitBuffer,
          hash
        },
        update: {
          fileData: fitBuffer,
          hash
        }
      })

      // Recalculate stress metrics with high-res data
      try {
        await calculateWorkoutStress(workoutId, userId)
      } catch (error) {
        logger.error(`Failed to calculate workout stress for ${workoutId}:`, { error })
      }

      return {
        success: true,
        workoutId
      }
    } catch (error) {
      logger.error('Error processing ROUVY FIT file', { error, activityId })
      throw error
    }
  }
})
