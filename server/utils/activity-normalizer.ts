/**
 * Normalizes a @sports-alliance/sports-lib EventInterface into the same
 * {workoutData, streams} shape produced by normalizeFitSession + extractFitStreams,
 * so the result can be fed directly into the existing workout ingestion pipeline.
 */
import type { EventInterface } from '@sports-alliance/sports-lib/lib/esm/events/event.interface'
import {
  DataAscent,
  DataAltitude,
  DataCadence,
  DataCadenceAvg,
  DataCadenceMax,
  DataDistance,
  DataDuration,
  DataElapsedTime,
  DataEnergy,
  DataGrade,
  DataHeartRate,
  DataHeartRateAvg,
  DataHeartRateMax,
  DataLatitudeDegrees,
  DataLongitudeDegrees,
  DataPower,
  DataPowerAvg,
  DataPowerMax,
  DataPowerNormalized,
  DataSpeed,
  DataSpeedAvg,
  DataTimerTime,
  DataTrainingStressScore
} from '@sports-alliance/sports-lib'

export interface NormalizedActivityData {
  userId: string
  externalId: string
  source: string
  date: Date
  title: string
  description: string
  type: string

  durationSec: number
  distanceMeters?: number
  elevationGain?: number
  calories?: number

  averageWatts?: number
  maxWatts?: number
  normalizedPower?: number
  averageHr?: number
  maxHr?: number
  averageCadence?: number
  maxCadence?: number
  averageSpeed?: number

  tss?: number
  rawJson: any
}

export interface NormalizedStreams {
  time: number[]
  distance: number[]
  velocity: number[]
  heartrate: number[]
  cadence: number[]
  watts: number[]
  altitude: number[]
  latlng: [number, number][]
  grade: number[]
  moving: boolean[]
  leftRightBalance: number[]
  targetPower: number[]
}

const MOVING_THRESHOLD_MS = 0.5 // m/s

/**
 * Maps sports-lib activity type strings to our internal workout type labels.
 */
function mapActivityType(sportsLibType: string): string {
  const lower = sportsLibType?.toLowerCase() ?? ''
  if (lower.includes('cycling') || lower.includes('bike') || lower.includes('ride'))
    return 'Cycling'
  if (lower.includes('run')) return 'Running'
  if (lower.includes('swim')) return 'Swimming'
  if (lower.includes('walk')) return 'Walking'
  if (lower.includes('hike') || lower.includes('hiking')) return 'Hiking'
  if (lower.includes('row')) return 'Rowing'
  if (lower.includes('ski')) return 'Skiing'
  if (lower.includes('strength') || lower.includes('weight')) return 'Strength'
  if (lower.includes('yoga')) return 'Yoga'
  return 'Activity'
}

function statValue(
  activity: ReturnType<EventInterface['getFirstActivity']>,
  type: string
): number | undefined {
  const stat = activity.getStat(type)
  if (!stat) return undefined
  const val = (stat as any).getValue?.()
  return val != null && !isNaN(val) ? val : undefined
}

/**
 * Extracts a named stream from the activity, returning only non-null numbers.
 * Returns an empty array if the stream is not available.
 */
function getStreamNumbers(
  activity: ReturnType<EventInterface['getFirstActivity']>,
  streamType: string
): number[] {
  if (!activity.hasStreamData(streamType)) return []
  const data = activity.getStreamData(streamType)
  return data.filter((v): v is number => v !== null)
}

/**
 * Normalizes a sports-lib Event into our internal workout + streams format.
 *
 * @param event   Parsed sports-lib event (from importFromGPX / importFromTCX)
 * @param userId  Target user ID
 * @param filename  Original filename (used for externalId + description)
 * @param activityName  Optional display name override
 */
export function normalizeActivityEvent(
  event: EventInterface,
  userId: string,
  filename: string,
  activityName?: string
): { workoutData: NormalizedActivityData; streams: NormalizedStreams } {
  const activity = event.getFirstActivity()

  // ── Date / identity ──────────────────────────────────────────────────────
  const startDate =
    activity.startDate instanceof Date ? activity.startDate : new Date(activity.startDate as any)
  const timestamp = startDate.getTime()
  const externalId = `activity_${timestamp}_${filename.replace(/\W/g, '_')}`

  const filenameBase = filename
    .replace(/\.(gpx|tcx|fit)$/i, '')
    .replace(/[_-]/g, ' ')
    .trim()
  const hasOpaqueFilename = /^[\d\s]+$/.test(filenameBase)
  const activityType = mapActivityType(String(activity.type ?? ''))
  const title =
    activityName?.trim() || (hasOpaqueFilename ? `${activityType} workout` : filenameBase)
  const ext = filename.split('.').pop()?.toUpperCase() ?? 'Activity'

  // ── Summary stats ─────────────────────────────────────────────────────────
  const durationRaw =
    statValue(activity, DataTimerTime.type) ?? statValue(activity, DataDuration.type) ?? 0
  const durationSec = Math.round(durationRaw)

  const distanceRaw = statValue(activity, DataDistance.type)
  const elevGain = statValue(activity, DataAscent.type)
  const calories = statValue(activity, DataEnergy.type)
  const avgPower = statValue(activity, DataPowerAvg.type)
  const maxPower = statValue(activity, DataPowerMax.type)
  const normPower = statValue(activity, DataPowerNormalized.type)
  const avgHr = statValue(activity, DataHeartRateAvg.type)
  const maxHr = statValue(activity, DataHeartRateMax.type)
  const avgCadence = statValue(activity, DataCadenceAvg.type)
  const maxCadence = statValue(activity, DataCadenceMax.type)
  const avgSpeed = statValue(activity, DataSpeedAvg.type) // m/s
  const tss = statValue(activity, DataTrainingStressScore.type)

  // ── Per-sample streams ────────────────────────────────────────────────────
  const timeData = getStreamNumbers(activity, DataElapsedTime.type)
  const distanceData = getStreamNumbers(activity, DataDistance.type)
  const speedData = getStreamNumbers(activity, DataSpeed.type)
  const hrData = getStreamNumbers(activity, DataHeartRate.type)
  const cadenceData = getStreamNumbers(activity, DataCadence.type)
  const powerData = getStreamNumbers(activity, DataPower.type)
  const altitudeData = getStreamNumbers(activity, DataAltitude.type)
  const gradeData = getStreamNumbers(activity, DataGrade.type)
  const latData = getStreamNumbers(activity, DataLatitudeDegrees.type)
  const lonData = getStreamNumbers(activity, DataLongitudeDegrees.type)

  const n = timeData.length

  // Build latlng pairs (only if both streams present and same length)
  const latlng: [number, number][] =
    latData.length === lonData.length && latData.length > 0
      ? latData.map((lat, i) => [lat, lonData[i]!] as [number, number])
      : []

  // Derive grade from altitude + distance if missing
  let grade = gradeData
  if (grade.length === 0 && altitudeData.length === n && distanceData.length === n && n > 0) {
    grade = altitudeData.map((alt, i) => {
      if (i === 0) return 0
      const distDiff = distanceData[i]! - distanceData[i - 1]!
      const altDiff = alt - altitudeData[i - 1]!
      return distDiff > 0 ? (altDiff / distDiff) * 100 : 0
    })
  }

  // Derive moving from speed (or cadence/power as fallback)
  let moving: boolean[] = []
  if (speedData.length === n && n > 0) {
    moving = speedData.map((v) => v > MOVING_THRESHOLD_MS)
  } else if (cadenceData.length === n && n > 0) {
    moving = cadenceData.map((c) => c > 0)
  } else if (powerData.length === n && n > 0) {
    moving = powerData.map((p) => p > 0)
  }

  const streams: NormalizedStreams = {
    time: timeData,
    distance: distanceData,
    velocity: speedData,
    heartrate: hrData,
    cadence: cadenceData,
    watts: powerData,
    altitude: altitudeData,
    latlng,
    grade,
    moving,
    leftRightBalance: [],
    targetPower: []
  }

  const workoutData: NormalizedActivityData = {
    userId,
    externalId,
    source: ext === 'GPX' ? 'gpx_file' : ext === 'TCX' ? 'tcx_file' : 'activity_file',
    date: startDate,
    title,
    description: `Imported from ${filename}`,
    type: activityType,

    durationSec,
    distanceMeters: distanceRaw,
    elevationGain: elevGain != null ? Math.round(elevGain) : undefined,
    calories: calories != null ? Math.round(calories) : undefined,

    averageWatts: avgPower != null ? Math.round(avgPower) || undefined : undefined,
    maxWatts: maxPower != null ? Math.round(maxPower) || undefined : undefined,
    normalizedPower: normPower != null ? Math.round(normPower) || undefined : undefined,
    averageHr: avgHr != null ? Math.round(avgHr) || undefined : undefined,
    maxHr: maxHr != null ? Math.round(maxHr) || undefined : undefined,
    averageCadence: avgCadence != null ? Math.round(avgCadence) || undefined : undefined,
    maxCadence: maxCadence != null ? Math.round(maxCadence) || undefined : undefined,
    averageSpeed: avgSpeed,

    tss,
    rawJson: { filename, activityType: String(activity.type ?? '') }
  }

  return { workoutData, streams }
}
