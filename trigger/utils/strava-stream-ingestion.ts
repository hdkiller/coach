import { logger } from '@trigger.dev/sdk/v3'
import { prisma } from '../../server/utils/db'
import { fetchStravaActivityStreams } from '../../server/utils/strava'
import {
  calculateLapSplits,
  calculatePaceVariability,
  calculateAveragePace,
  analyzePacingStrategy,
  detectSurges
} from '../../server/utils/pacing'
import { normalizeTSS } from '../../server/utils/normalize-tss'
import { calculateWorkoutStress } from '../../server/utils/calculate-workout-stress'

function isStravaStreamsNotFoundError(error: unknown) {
  return error instanceof Error && error.message.startsWith('Strava Streams API error: 404')
}

export async function ingestStravaStreamsForWorkout(payload: {
  userId: string
  workoutId: string
  activityId: number
  integration: any
}) {
  logger.log('Fetching streams from Strava API', {
    workoutId: payload.workoutId,
    activityId: payload.activityId
  })

  let streams: Record<string, any> = {}
  let streamsUnavailable = false

  try {
    streams = await fetchStravaActivityStreams(payload.integration, payload.activityId, [
      'time',
      'distance',
      'velocity_smooth',
      'heartrate',
      'cadence',
      'watts',
      'altitude',
      'latlng',
      'grade_smooth',
      'moving'
    ])
  } catch (error: any) {
    if (!isStravaStreamsNotFoundError(error)) {
      throw error
    }

    streamsUnavailable = true
    logger.warn('Strava streams unavailable for activity; storing empty stream record', {
      workoutId: payload.workoutId,
      activityId: payload.activityId,
      error: error.message
    })
  }

  const timeData = (streams.time?.data as number[]) || []
  const distanceData = (streams.distance?.data as number[]) || []
  const velocityData = (streams.velocity_smooth?.data as number[]) || []
  const heartrateData = (streams.heartrate?.data as number[]) || null
  const cadenceData = (streams.cadence?.data as number[]) || null
  const wattsData = (streams.watts?.data as number[]) || null
  const altitudeData = (streams.altitude?.data as number[]) || null
  const latlngData = (streams.latlng?.data as [number, number][]) || null
  const gradeData = (streams.grade_smooth?.data as number[]) || null
  const movingData = (streams.moving?.data as boolean[]) || null

  logger.log('Processing stream data', {
    workoutId: payload.workoutId,
    timePoints: timeData.length,
    distancePoints: distanceData.length,
    velocityPoints: velocityData.length
  })

  let lapSplits: any = undefined
  let paceVariability: number | undefined = undefined
  let avgPacePerKm: number | undefined = undefined
  let pacingStrategy: any = undefined
  let surges: any = undefined

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

  const workoutStream = await prisma.workoutStream.upsert({
    where: { workoutId: payload.workoutId },
    create: {
      workoutId: payload.workoutId,
      time: timeData,
      distance: distanceData,
      velocity: velocityData,
      heartrate: heartrateData,
      cadence: cadenceData,
      watts: wattsData,
      altitude: altitudeData,
      latlng: latlngData,
      grade: gradeData,
      moving: movingData,
      lapSplits,
      paceVariability,
      avgPacePerKm,
      pacingStrategy,
      surges
    },
    update: {
      time: timeData,
      distance: distanceData,
      velocity: velocityData,
      heartrate: heartrateData,
      cadence: cadenceData,
      watts: wattsData,
      altitude: altitudeData,
      latlng: latlngData,
      grade: gradeData,
      moving: movingData,
      lapSplits,
      paceVariability,
      avgPacePerKm,
      pacingStrategy,
      surges,
      updatedAt: new Date()
    }
  })

  try {
    const tssResult = await normalizeTSS(payload.workoutId, payload.userId)
    logger.log('TSS normalization complete', {
      workoutId: payload.workoutId,
      tss: tssResult.tss,
      source: tssResult.source,
      confidence: tssResult.confidence
    })

    if (tssResult.tss !== null) {
      await calculateWorkoutStress(payload.workoutId, payload.userId)
    }
  } catch (error: any) {
    logger.error('Failed to normalize TSS', {
      workoutId: payload.workoutId,
      error: error.message
    })
  }

  return {
    workoutId: payload.workoutId,
    streamId: workoutStream.id,
    metrics: {
      dataPoints: timeData.length,
      laps: lapSplits?.length || 0,
      avgPacePerKm,
      paceVariability,
      pacingStrategy: pacingStrategy?.strategy,
      surges: surges?.length || 0,
      streamsUnavailable
    }
  }
}
