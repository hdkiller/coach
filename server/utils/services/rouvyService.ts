import crypto from 'node:crypto'
import { prisma } from '../db'
import { workoutRepository } from '../repositories/workoutRepository'
import { workoutStreamRepository } from '../repositories/workoutStreamRepository'
import { fetchRouvyActivityFitFile } from '../rouvy'
import {
  parseFitFile,
  normalizeFitSession,
  extractFitStreams,
  reconstructSessionFromRecords,
  extractFitExtrasMeta
} from '../fit'
import { calculateWorkoutStress } from '../calculate-workout-stress'
import {
  calculateLapSplits,
  calculatePaceVariability,
  calculateAveragePace,
  analyzePacingStrategy,
  detectSurges
} from '../pacing'
import { registerTaskHandler } from '../task-registry'

export interface IngestRouvyFitPayload {
  userId: string
  workoutId: string
  activityId: string
}

export async function ingestRouvyFitFile(payload: IngestRouvyFitPayload) {
  const { userId, workoutId, activityId } = payload

  console.log('[RouvyService] Starting ROUVY FIT file ingestion', { userId, workoutId, activityId })

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
    console.log(`[RouvyService] Fetching FIT file for ROUVY activity ${activityId}...`)
    const fitBuffer = await fetchRouvyActivityFitFile(integration, activityId)

    // Parse file content
    console.log('[RouvyService] Parsing FIT file from ROUVY...')
    const fitData = await parseFitFile(fitBuffer)

    // Get main session
    let session = fitData.sessions[0]
    if (!session) {
      if (fitData.records && fitData.records.length > 0) {
        console.log(
          '[RouvyService] No session data found in FIT file, attempting to reconstruct from records'
        )
        session = reconstructSessionFromRecords(fitData.records)
      }
    }

    if (!session) {
      throw new Error('No session data found in FIT file and could not reconstruct from records')
    }

    // Normalize to workout
    console.log('[RouvyService] Normalizing session data...')
    const workoutData = normalizeFitSession(session, userId, `rouvy_${activityId}.fit`)

    // Extract streams
    console.log('[RouvyService] Extracting and saving streams...')
    const streams = extractFitStreams(fitData.records)
    const extrasMeta = extractFitExtrasMeta(fitData)

    // Calculate pacing metrics
    let lapSplits: any = null
    let paceVariability: number | null = null
    let avgPacePerKm: number | null = null
    let pacingStrategy: any = null
    let surges: any = null

    const timeData = streams.time || []
    const distanceData = streams.distance || []
    const velocityData = streams.velocity || []

    if (timeData.length > 0 && distanceData.length > 0) {
      lapSplits = calculateLapSplits(timeData, distanceData, 1000)
      if (velocityData.length > 0) {
        paceVariability = calculatePaceVariability(velocityData)
        const lastTime = timeData[timeData.length - 1]
        const lastDist = distanceData[distanceData.length - 1]
        if (typeof lastTime === 'number' && typeof lastDist === 'number') {
          avgPacePerKm = calculateAveragePace(lastTime, lastDist)
        }
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
    await workoutStreamRepository.upsert(workoutId, {
      ...streams,
      extrasMeta,
      lapSplits,
      paceVariability,
      avgPacePerKm,
      pacingStrategy,
      surges
    })

    // Save FIT file to DB for backup/future use
    const hash = crypto.createHash('sha256').update(fitBuffer).digest('hex')
    const uint8Data = new Uint8Array(fitBuffer)

    await prisma.fitFile.upsert({
      where: { workoutId },
      create: {
        userId,
        workoutId,
        filename: `rouvy_${activityId}.fit`,
        fileData: uint8Data,
        hash
      },
      update: {
        fileData: uint8Data,
        hash
      }
    })

    // Recalculate stress metrics with high-res data
    try {
      await calculateWorkoutStress(workoutId, userId)
    } catch (error) {
      console.error(`[RouvyService] Failed to calculate workout stress for ${workoutId}:`, {
        error
      })
    }

    return {
      success: true,
      workoutId
    }
  } catch (error) {
    console.error('[RouvyService] Error processing ROUVY FIT file', { error, activityId })
    throw error
  }
}

export const rouvyService = {
  ingestRouvyFitFile
}

// Register task handler for Redis/BullMQ worker execution
registerTaskHandler('ingest-rouvy-fit', ingestRouvyFitFile)
