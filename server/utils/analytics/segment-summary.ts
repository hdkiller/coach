import { prisma } from '../db'
import { getZoneIndex } from '../training-metrics'
import { sportSettingsRepository } from '../repositories/sportSettingsRepository'
import { calculateNormalizedPower } from '../power-metrics'

interface SegmentRange {
  start: number
  end: number
  alignment: 'elapsed_time' | 'distance' | 'percent_complete'
}

export interface SegmentSummaryResult {
  averageWatts: number | null
  maxWatts: number | null
  normalizedPower: number | null
  averageHr: number | null
  maxHr: number | null
  averageCadence: number | null
  durationSec: number
  distanceMeters: number
  elevationGain: number
  gradientPercent: number | null
  vam: number | null
  startIndex?: number
  endIndex?: number
  startTime?: number
  endTime?: number
  zoneDistribution?: {
    hr?: any
    power?: any
  }
}

interface SegmentMetricStreams {
  time?: number[]
  distance?: number[]
  watts?: number[]
  heartrate?: number[]
  cadence?: number[]
  altitude?: number[]
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function average(values: number[]) {
  const valid = values.filter(isFiniteNumber)
  return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null
}

function max(values: number[]) {
  const valid = values.filter(isFiniteNumber)
  return valid.length > 0 ? Math.max(...valid) : null
}

function sliceValid(stream: number[] | undefined, startIdx: number, endIdx: number) {
  return Array.isArray(stream) ? stream.slice(startIdx, endIdx + 1).filter(isFiniteNumber) : []
}

export function calculateSegmentMetricsFromStreams(
  streams: SegmentMetricStreams,
  startIdx: number,
  endIdx: number
): Omit<SegmentSummaryResult, 'zoneDistribution'> {
  const time = streams.time || []
  const distance = streams.distance || []
  const watts = streams.watts || []
  const heartrate = streams.heartrate || []
  const cadence = streams.cadence || []
  const altitude = streams.altitude || []

  const safeStartIdx = Math.max(0, Math.min(startIdx, Math.max(0, time.length - 1)))
  const safeEndIdx = Math.max(safeStartIdx, Math.min(endIdx, Math.max(0, time.length - 1)))

  const segmentWatts = sliceValid(watts, safeStartIdx, safeEndIdx)
  const segmentHr = sliceValid(heartrate, safeStartIdx, safeEndIdx)
  const segmentCadence = sliceValid(cadence, safeStartIdx, safeEndIdx)
  const segmentAltitude = sliceValid(altitude, safeStartIdx, safeEndIdx)

  const startTime = time[safeStartIdx] || 0
  const endTime = time[safeEndIdx] || startTime
  const durationSec = Math.max(0, endTime - startTime)

  const startDistance = distance[safeStartIdx]
  const endDistance = distance[safeEndIdx]
  const distanceMeters =
    isFiniteNumber(startDistance) && isFiniteNumber(endDistance)
      ? Math.max(0, endDistance - startDistance)
      : 0

  let elevationGain = 0
  if (segmentAltitude.length > 1) {
    for (let i = 1; i < segmentAltitude.length; i++) {
      const diff = segmentAltitude[i]! - segmentAltitude[i - 1]!
      if (diff > 0) elevationGain += diff
    }
  }

  const startAltitude = altitude[safeStartIdx]
  const endAltitude = altitude[safeEndIdx]
  const netElevation =
    isFiniteNumber(startAltitude) && isFiniteNumber(endAltitude)
      ? endAltitude - startAltitude
      : null
  const gradientPercent =
    netElevation !== null && distanceMeters > 0
      ? Math.round((netElevation / distanceMeters) * 1000) / 10
      : null
  const vam =
    durationSec > 0 && elevationGain > 0 ? Math.round((elevationGain / durationSec) * 3600) : null

  return {
    averageWatts: average(segmentWatts),
    maxWatts: max(segmentWatts),
    normalizedPower:
      segmentWatts.length > 0 ? Math.round(calculateNormalizedPower(segmentWatts)) : null,
    averageHr: average(segmentHr),
    maxHr: max(segmentHr),
    averageCadence: average(segmentCadence),
    durationSec,
    distanceMeters,
    elevationGain: Math.round(elevationGain),
    gradientPercent,
    vam,
    startIndex: safeStartIdx,
    endIndex: safeEndIdx,
    startTime,
    endTime
  }
}

/**
 * Calculates metrics for a specific segment of a workout.
 */
export async function calculateSegmentSummary(
  userId: string,
  workoutId: string,
  range: SegmentRange
): Promise<SegmentSummaryResult> {
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    select: { type: true, streams: true }
  })

  if (!workout || !workout.streams) {
    throw new Error('Workout or streams not found')
  }

  const s = workout.streams as any
  const time = s.time as number[]
  const distance = s.distance as number[]
  const watts = s.watts as number[]
  const heartrate = s.heartrate as number[]
  const cadence = s.cadence as number[]
  const altitude = s.altitude as number[]

  let alignmentStream: number[]
  if (range.alignment === 'percent_complete') {
    const maxTime = time[time.length - 1] || 1
    alignmentStream = time.map((t) => (t / maxTime) * 100)
  } else {
    alignmentStream = range.alignment === 'elapsed_time' ? time : distance
  }

  if (!alignmentStream) throw new Error('Alignment stream not found')

  // Find indices for the range
  let startIdx = 0
  let endIdx = alignmentStream.length - 1

  for (let i = 0; i < alignmentStream.length; i++) {
    if (alignmentStream[i]! >= range.start) {
      startIdx = i
      break
    }
  }
  for (let i = alignmentStream.length - 1; i >= 0; i--) {
    if (alignmentStream[i]! <= range.end) {
      endIdx = i
      break
    }
  }

  if (startIdx >= endIdx) {
    // Fallback or empty result
    return {
      averageWatts: null,
      maxWatts: null,
      normalizedPower: null,
      averageHr: null,
      maxHr: null,
      averageCadence: null,
      durationSec: 0,
      distanceMeters: 0,
      elevationGain: 0,
      gradientPercent: null,
      vam: null
    }
  }

  const metrics = calculateSegmentMetricsFromStreams(
    { time, distance, watts, heartrate, cadence, altitude },
    startIdx,
    endIdx
  )

  const segmentWatts = watts?.slice(startIdx, endIdx + 1).filter((v) => v !== null) || []
  const segmentHr = heartrate?.slice(startIdx, endIdx + 1).filter((v) => v !== null) || []

  // Zone Distribution for Segment
  const sportSettings = await sportSettingsRepository.getForActivityType(
    userId,
    workout.type || 'Cycling'
  )
  const hrZones = (sportSettings?.hrZones as any[]) || []
  const powerZones = (sportSettings?.powerZones as any[]) || []

  const zoneResult: any = {}
  if (hrZones.length > 0 && segmentHr.length > 0) {
    const counts = new Array(hrZones.length).fill(0)
    segmentHr.forEach((hr) => {
      const idx = getZoneIndex(hr, hrZones)
      if (idx >= 0) counts[idx]++
    })
    zoneResult.hr = {
      type: 'hr',
      totalTime: segmentHr.length,
      zones: hrZones.map((z, i) => ({
        name: z.name,
        timeSeconds: counts[i],
        percentage: (counts[i] / segmentHr.length) * 100
      }))
    }
  }

  if (powerZones.length > 0 && segmentWatts.length > 0) {
    const counts = new Array(powerZones.length).fill(0)
    segmentWatts.forEach((w) => {
      const idx = getZoneIndex(w, powerZones)
      if (idx >= 0) counts[idx]++
    })
    zoneResult.power = {
      type: 'power',
      totalTime: segmentWatts.length,
      zones: powerZones.map((z, i) => ({
        name: z.name,
        timeSeconds: counts[i],
        percentage: (counts[i] / segmentWatts.length) * 100
      }))
    }
  }

  return {
    ...metrics,
    zoneDistribution: zoneResult
  }
}
