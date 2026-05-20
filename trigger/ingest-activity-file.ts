import './init'
import { logger, task } from '@trigger.dev/sdk/v3'
import { userIngestionQueue } from './queues'
import { prisma } from '../server/utils/db'
import { workoutRepository } from '../server/utils/repositories/workoutRepository'
import {
  parseFitFile,
  normalizeFitSession,
  extractFitStreams,
  reconstructSessionFromRecords,
  extractFitExtrasMeta
} from '../server/utils/fit'
import { normalizeActivityEvent } from '../server/utils/activity-normalizer'
import { calculateWorkoutStress } from '../server/utils/calculate-workout-stress'
import {
  calculateLapSplits,
  calculatePaceVariability,
  calculateAveragePace,
  analyzePacingStrategy,
  detectSurges
} from '../server/utils/pacing'
import { SportsLib } from '@sports-alliance/sports-lib'
import { DOMParser } from '@xmldom/xmldom'

export const ingestActivityFile = task({
  id: 'ingest-activity-file',
  queue: userIngestionQueue,
  maxDuration: 600,
  run: async (payload: {
    userId: string
    fitFileId: string
    activityName?: string
    rawJson?: any
    oauthAppId?: string
    externalId?: string
  }) => {
    const {
      userId,
      fitFileId,
      activityName,
      rawJson,
      oauthAppId,
      externalId: providedExternalId
    } = payload

    const fitFile = await prisma.fitFile.findUnique({ where: { id: fitFileId } })
    if (!fitFile) throw new Error(`Activity file not found: ${fitFileId}`)

    logger.log('Starting activity file ingestion', {
      userId,
      fitFileId,
      fileType: fitFile.fileType,
      filename: fitFile.filename
    })

    const fileType = fitFile.fileType ?? 'FIT'
    let workoutData: ReturnType<typeof normalizeFitSession>
    let streams: ReturnType<typeof extractFitStreams>
    let extrasMeta: ReturnType<typeof extractFitExtrasMeta> | null = null

    try {
      if (fileType === 'FIT') {
        // ── FIT path (unchanged from ingest-fit-file) ──────────────────────
        const fitData = await parseFitFile(Buffer.from(fitFile.fileData))

        let session = fitData.sessions[0]
        if (!session && fitData.records?.length > 0) {
          logger.log('No session in FIT file, reconstructing from records')
          session = reconstructSessionFromRecords(fitData.records)
        }
        if (!session) throw new Error('No session data found in FIT file')

        workoutData = normalizeFitSession(session, userId, fitFile.filename, activityName)
        streams = extractFitStreams(fitData.records)
        extrasMeta = extractFitExtrasMeta(fitData)
      } else {
        // ── GPX / TCX path via @sports-alliance/sports-lib ─────────────────
        const fileBuffer = Buffer.from(fitFile.fileData)
        let event

        if (fileType === 'GPX') {
          event = await SportsLib.importFromGPX(fileBuffer.toString('utf-8'), DOMParser)
        } else {
          // TCX
          const xmlDoc = new DOMParser().parseFromString(
            fileBuffer.toString('utf-8'),
            'application/xml'
          )
          event = await SportsLib.importFromTCX(xmlDoc as any)
        }

        const normalized = normalizeActivityEvent(event, userId, fitFile.filename, activityName)
        workoutData = normalized.workoutData as any
        streams = normalized.streams as any
      }

      if (providedExternalId) workoutData.externalId = providedExternalId
      if (oauthAppId) (workoutData as any).oauthAppId = oauthAppId

      // ── Pacing metrics (shared for all formats) ─────────────────────────
      const timeData = streams.time ?? []
      const distanceData = streams.distance ?? []
      const velocityData = streams.velocity ?? []

      let lapSplits = null
      let paceVariability = null
      let avgPacePerKm = null
      let pacingStrategy = null
      let surges = null

      if (timeData.length > 0 && distanceData.length > 0) {
        lapSplits = calculateLapSplits(timeData, distanceData, 1000)
        logger.log('Calculated lap splits', { laps: lapSplits.length })

        if (velocityData.length > 0) {
          paceVariability = calculatePaceVariability(velocityData)
          avgPacePerKm = calculateAveragePace(
            timeData[timeData.length - 1]!,
            distanceData[distanceData.length - 1]!
          )
        }
        if (lapSplits.length >= 2) {
          pacingStrategy = analyzePacingStrategy(lapSplits)
        }
        if (velocityData.length > 20 && timeData.length > 20) {
          surges = detectSurges(velocityData, timeData)
        }
      }

      // ── Upsert workout ───────────────────────────────────────────────────
      const { record: upsertedWorkout } = await workoutRepository.upsert(
        userId,
        workoutData.source,
        workoutData.externalId,
        { ...workoutData, rawJson: rawJson || null },
        { ...workoutData, rawJson: rawJson || null }
      )

      logger.log(`Upserted workout: ${upsertedWorkout.id}`)

      // Link file to workout
      await prisma.fitFile.update({
        where: { id: fitFileId },
        data: { workoutId: upsertedWorkout.id }
      })

      // Save streams
      await prisma.workoutStream.upsert({
        where: { workoutId: upsertedWorkout.id },
        create: {
          workoutId: upsertedWorkout.id,
          ...streams,
          ...(extrasMeta ? { extrasMeta } : {}),
          lapSplits,
          paceVariability,
          avgPacePerKm,
          pacingStrategy,
          surges
        },
        update: {
          ...streams,
          ...(extrasMeta ? { extrasMeta } : {}),
          lapSplits,
          paceVariability,
          avgPacePerKm,
          pacingStrategy,
          surges
        }
      })

      // Calculate stress metrics
      try {
        await calculateWorkoutStress(upsertedWorkout.id, userId)
        logger.log(`Calculated workout stress for ${upsertedWorkout.id}`)
      } catch (error) {
        logger.error(`Failed to calculate workout stress for ${upsertedWorkout.id}:`, { error })
      }

      return {
        success: true,
        workoutId: upsertedWorkout.id,
        filename: fitFile.filename,
        fileType
      }
    } catch (error) {
      logger.error('Error processing activity file', { error, fitFileId, fileType })
      throw error
    }
  }
})
