import { prisma } from '../db'
import { calculatePowerZones, calculateHrZones } from '../zones'
import { getZoneIndex } from '../training-metrics'
import { sportSettingsRepository } from '../repositories/sportSettingsRepository'

interface SegmentRange {
  start: number
  end: number
  alignment: 'elapsed_time' | 'distance'
}

interface SegmentSummaryResult {
  averageWatts: number | null
  maxWatts: number | null
  normalizedPower: number | null
  averageHr: number | null
  maxHr: number | null
  averageCadence: number | null
  durationSec: number
  distanceMeters: number
  elevationGain: number
  zoneDistribution?: {
    hr?: any
    power?: any
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

  const alignmentStream = range.alignment === 'elapsed_time' ? time : distance
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
      elevationGain: 0
    }
  }

  const segmentWatts = watts?.slice(startIdx, endIdx + 1).filter((v) => v !== null) || []
  const segmentHr = heartrate?.slice(startIdx, endIdx + 1).filter((v) => v !== null) || []
  const segmentCadence = cadence?.slice(startIdx, endIdx + 1).filter((v) => v !== null) || []
  const segmentAltitude = altitude?.slice(startIdx, endIdx + 1).filter((v) => v !== null) || []

  const avg = (arr: number[]) =>
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null
  const max = (arr: number[]) => (arr.length > 0 ? Math.max(...arr) : null)

  // Normalized Power (NP) calculation for segment
  let np: number | null = null
  if (segmentWatts.length >= 30) {
    // 30s rolling average
    const rolling: number[] = []
    for (let i = 29; i < segmentWatts.length; i++) {
      const sum = segmentWatts.slice(i - 29, i + 1).reduce((a, b) => a + b, 0)
      rolling.push(Math.pow(sum / 30, 4))
    }
    if (rolling.length > 0) {
      np = Math.round(Math.pow(rolling.reduce((a, b) => a + b, 0) / rolling.length, 0.25))
    }
  }

  // Elevation gain in segment
  let elevationGain = 0
  if (segmentAltitude.length > 1) {
    for (let i = 1; i < segmentAltitude.length; i++) {
      const diff = segmentAltitude[i]! - segmentAltitude[i - 1]!
      if (diff > 0) elevationGain += diff
    }
  }

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
    averageWatts: avg(segmentWatts),
    maxWatts: max(segmentWatts),
    normalizedPower: np,
    averageHr: avg(segmentHr),
    maxHr: max(segmentHr),
    averageCadence: avg(segmentCadence),
    durationSec: time[endIdx]! - time[startIdx]!,
    distanceMeters: distance[endIdx]! - distance[startIdx]!,
    elevationGain: Math.round(elevationGain),
    zoneDistribution: zoneResult
  }
}
