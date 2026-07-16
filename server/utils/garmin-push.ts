import type { Integration } from '@prisma/client'
import { refreshGarminToken } from './garmin'

/**
 * Ensures a valid token, refreshing if necessary
 */
async function ensureValidToken(integration: Integration): Promise<Integration> {
  if (!integration.expiresAt || new Date() >= new Date(integration.expiresAt.getTime() - 300000)) {
    return await refreshGarminToken(integration)
  }
  return integration
}

export type GarminTargetThresholds = {
  ftp?: number
  lthr?: number
  maxHr?: number
}

type GarminTargetFields = {
  targetType: string
  targetValue?: number
  targetValueLow?: number
  targetValueHigh?: number
  targetValueType?: string
  secondaryTargetType?: string
  secondaryTargetValue?: number
  secondaryTargetValueLow?: number
  secondaryTargetValueHigh?: number
  secondaryTargetValueType?: string
}

type GarminMetricCandidate = {
  kind: 'POWER' | 'HEART_RATE' | 'PACE' | 'CADENCE'
  targetValue?: number
  targetValueLow?: number
  targetValueHigh?: number
  targetValueType?: string
}

const WORKOUT_PROVIDER = 'COACH_WATTZ'
const GARMIN_TRAINING_WORKOUT_V2 = 'https://apis.garmin.com/training-api/workout/v2'
const GARMIN_TRAINING_WORKOUT_CREATE_V2 = 'https://apis.garmin.com/workoutportal/workout/v2'
const GARMIN_TRAINING_SCHEDULE = 'https://apis.garmin.com/training-api/schedule'

function getGarminHeaders(accessToken: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`
  }
}

function mapStepIntensity(stepType: string): string {
  const type = stepType?.toLowerCase?.() || ''
  if (type.includes('warm')) return 'WARMUP'
  if (type.includes('cool')) return 'COOLDOWN'
  if (type.includes('recover')) return 'RECOVERY'
  if (type.includes('rest')) return 'REST'
  if (type.includes('interval')) return 'INTERVAL'
  return 'ACTIVE'
}

function getDurationType(step: any): string {
  if (step?.distance) return 'DISTANCE'
  if (step?.durationSec || step?.durationSeconds || step?.duration) return 'TIME'
  return 'OPEN'
}

function getDurationValue(step: any): number {
  if (step?.distance) return Number(step.distance) || 0
  return Number(step?.durationSec || step?.durationSeconds || step?.duration) || 0
}

function normalizeRelativeFraction(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0
  if (value > 3) return value / 100
  return value
}

function isRelativePowerUnits(units: unknown): boolean {
  const normalized = String(units || '')
    .trim()
    .toLowerCase()
  return (
    normalized.includes('%') || normalized === '' || normalized === 'ftp' || normalized === '%ftp'
  )
}

function isRelativeHeartRateUnits(units: unknown): boolean {
  const normalized = String(units || '')
    .trim()
    .toLowerCase()
  return (
    normalized.includes('%') ||
    normalized === '' ||
    normalized === 'lthr' ||
    normalized === '%lthr' ||
    normalized === 'max_hr' ||
    normalized === 'maxhr'
  )
}

function toAbsolutePower(
  value: number,
  units: unknown,
  thresholds: GarminTargetThresholds
): number {
  if (!isRelativePowerUnits(units)) return Math.round(value)
  const ftp = Number(thresholds.ftp) || 250
  return Math.round(normalizeRelativeFraction(value) * ftp)
}

function toAbsoluteHeartRate(
  value: number,
  units: unknown,
  thresholds: GarminTargetThresholds
): number {
  if (!isRelativeHeartRateUnits(units)) return Math.round(value)
  const normalized = String(units || '')
    .trim()
    .toLowerCase()
  const basis =
    normalized.includes('max') && thresholds.maxHr
      ? Number(thresholds.maxHr)
      : Number(thresholds.lthr) || 160
  return Math.round(normalizeRelativeFraction(value) * basis)
}

function extractCadenceValue(cadence: unknown): number | null {
  if (typeof cadence === 'number' && Number.isFinite(cadence)) return cadence
  if (cadence && typeof cadence === 'object') {
    const value = Number((cadence as any).value)
    if (Number.isFinite(value)) return value
  }
  return null
}

function collectMetricCandidates(
  step: any,
  thresholds: GarminTargetThresholds = {}
): GarminMetricCandidate[] {
  const candidates: GarminMetricCandidate[] = []
  const power = step?.power
  const hr = step?.heartRate || step?.hr
  const pace = step?.pace
  const cadence = extractCadenceValue(step?.cadence)

  if (power?.range) {
    candidates.push({
      kind: 'POWER',
      targetValueLow: toAbsolutePower(Number(power.range.start) || 0, power.units, thresholds),
      targetValueHigh: toAbsolutePower(Number(power.range.end) || 0, power.units, thresholds)
    })
  } else if (typeof power?.value === 'number') {
    candidates.push({
      kind: 'POWER',
      targetValue: toAbsolutePower(power.value, power.units, thresholds)
    })
  }

  if (hr?.range) {
    candidates.push({
      kind: 'HEART_RATE',
      targetValueLow: toAbsoluteHeartRate(Number(hr.range.start) || 0, hr.units, thresholds),
      targetValueHigh: toAbsoluteHeartRate(Number(hr.range.end) || 0, hr.units, thresholds)
    })
  } else if (typeof hr?.value === 'number') {
    candidates.push({
      kind: 'HEART_RATE',
      targetValue: toAbsoluteHeartRate(hr.value, hr.units, thresholds)
    })
  }

  if (pace?.range) {
    candidates.push({
      kind: 'PACE',
      targetValueLow: Number(pace.range.start) || 0,
      targetValueHigh: Number(pace.range.end) || 0
    })
  } else if (typeof pace?.value === 'number') {
    candidates.push({ kind: 'PACE', targetValue: pace.value })
  }

  if (cadence != null) {
    candidates.push({ kind: 'CADENCE', targetValue: cadence })
  }

  return candidates
}

/** Sport-aware metric priority for primary/secondary Garmin targets. */
function metricPriorityForSport(sport: string): GarminMetricCandidate['kind'][] {
  if (sport === 'RUNNING') return ['PACE', 'HEART_RATE', 'POWER', 'CADENCE']
  if (sport === 'CYCLING') return ['POWER', 'HEART_RATE', 'CADENCE', 'PACE']
  if (sport === 'LAP_SWIMMING') return ['PACE', 'HEART_RATE', 'CADENCE', 'POWER']
  return ['POWER', 'HEART_RATE', 'PACE', 'CADENCE']
}

function candidateToFields(
  candidate: GarminMetricCandidate,
  prefix: 'primary' | 'secondary'
): Record<string, unknown> {
  if (prefix === 'primary') {
    return {
      targetType: candidate.kind,
      ...(candidate.targetValue != null ? { targetValue: candidate.targetValue } : {}),
      ...(candidate.targetValueLow != null ? { targetValueLow: candidate.targetValueLow } : {}),
      ...(candidate.targetValueHigh != null ? { targetValueHigh: candidate.targetValueHigh } : {}),
      ...(candidate.targetValueType ? { targetValueType: candidate.targetValueType } : {})
    }
  }
  return {
    secondaryTargetType: candidate.kind,
    ...(candidate.targetValue != null ? { secondaryTargetValue: candidate.targetValue } : {}),
    ...(candidate.targetValueLow != null
      ? { secondaryTargetValueLow: candidate.targetValueLow }
      : {}),
    ...(candidate.targetValueHigh != null
      ? { secondaryTargetValueHigh: candidate.targetValueHigh }
      : {}),
    ...(candidate.targetValueType ? { secondaryTargetValueType: candidate.targetValueType } : {})
  }
}

function supportsSecondaryTarget(sport: string): boolean {
  // Training API V2 documents secondary targets for CYCLING (accessory) and swim.
  return sport === 'CYCLING' || sport === 'LAP_SWIMMING'
}

function getTargets(
  step: any,
  sport: string,
  thresholds: GarminTargetThresholds = {}
): GarminTargetFields {
  const candidates = collectMetricCandidates(step, thresholds)
  const priority = metricPriorityForSport(sport)
  const ranked = [...candidates].sort((a, b) => priority.indexOf(a.kind) - priority.indexOf(b.kind))

  const primary = ranked[0]
  if (!primary) return { targetType: 'OPEN' }

  const fields: GarminTargetFields = {
    ...(candidateToFields(primary, 'primary') as GarminTargetFields)
  }

  // V2: OPEN cannot be primary when a secondary target is present.
  if (supportsSecondaryTarget(sport)) {
    const secondary = ranked.find((candidate) => candidate.kind !== primary.kind)
    if (secondary) Object.assign(fields, candidateToFields(secondary, 'secondary'))
  }
  return fields
}

function getRepeatCount(step: any): number {
  const repsRaw = Number(step?.reps ?? step?.repeat ?? step?.intervals ?? 1)
  return Number.isFinite(repsRaw) && repsRaw > 0 ? Math.floor(repsRaw) : 1
}

function buildWorkoutStep(
  step: any,
  stepOrder: number,
  sport: string,
  thresholds: GarminTargetThresholds
): Record<string, unknown> {
  const durationType = getDurationType(step)
  const durationValue = getDurationValue(step)
  const targets = getTargets(step, sport, thresholds)

  return {
    type: 'WorkoutStep',
    stepOrder,
    intensity: mapStepIntensity(step.type || ''),
    description: step.name || undefined,
    durationType,
    ...(durationValue > 0 ? { durationValue } : {}),
    ...(durationType === 'DISTANCE' ? { durationValueType: 'METER' } : {}),
    ...targets
  }
}

/**
 * Convert canonical nested steps into Garmin V2 steps, preserving
 * WorkoutRepeatStep groups instead of unrolling them.
 * stepOrder is assigned globally (parent repeat before its children), matching V2 examples.
 */
function buildGarminSteps(
  steps: any[],
  sport: string,
  thresholds: GarminTargetThresholds
): Record<string, unknown>[] {
  let stepOrder = 1

  const convert = (step: any): Record<string, unknown> | null => {
    if (!step) return null
    const nested = Array.isArray(step.steps) ? step.steps.filter(Boolean) : []
    const reps = getRepeatCount(step)

    if (nested.length > 0) {
      const repeatOrder = stepOrder++
      const childSteps = nested
        .map((child: any) => convert(child))
        .filter(
          (child: Record<string, unknown> | null): child is Record<string, unknown> => child != null
        )
      return {
        type: 'WorkoutRepeatStep',
        stepOrder: repeatOrder,
        repeatType: 'REPEAT_UNTIL_STEPS_CMPLT',
        repeatValue: reps,
        steps: childSteps
      }
    }

    if (reps > 1) {
      const repeatOrder = stepOrder++
      return {
        type: 'WorkoutRepeatStep',
        stepOrder: repeatOrder,
        repeatType: 'REPEAT_UNTIL_STEPS_CMPLT',
        repeatValue: reps,
        steps: [buildWorkoutStep(step, stepOrder++, sport, thresholds)]
      }
    }

    return buildWorkoutStep(step, stepOrder++, sport, thresholds)
  }

  return (steps || [])
    .map((step) => convert(step))
    .filter((step): step is Record<string, unknown> => step != null)
}

/** Count leaf WorkoutSteps for the 100-step single-sport limit. */
export function countGarminWorkoutSteps(steps: Record<string, unknown>[]): number {
  let count = 0
  const visit = (list: Record<string, unknown>[]) => {
    for (const step of list || []) {
      if (step?.type === 'WorkoutRepeatStep' && Array.isArray(step.steps)) {
        visit(step.steps as Record<string, unknown>[])
      } else {
        count += 1
      }
    }
  }
  visit(steps)
  return count
}

export function buildGarminTrainingPayload(
  workout: any,
  thresholds: GarminTargetThresholds = {},
  options: { ownerId?: string | number | null } = {}
) {
  const sport = mapSportToGarmin(workout.type)
  const garminSteps = buildGarminSteps(workout?.steps || [], sport, thresholds)
  const stepCount = countGarminWorkoutSteps(garminSteps)
  if (stepCount > 100) {
    // Avoid importing h3 here — this module is pulled into Trigger.dev builds.
    const error = new Error(
      `Garmin workouts are limited to 100 steps (this workout has ${stepCount}).`
    ) as Error & { statusCode: number }
    error.statusCode = 422
    throw error
  }

  const ownerId = toGarminOwnerId(options.ownerId)

  return {
    ...(ownerId != null ? { ownerId } : {}),
    workoutName: workout.title,
    description: workout.description || '',
    sport,
    estimatedDurationInSecs: Number(workout.durationSec) || undefined,
    estimatedDistanceInMeters: Number(workout.distanceMeters) || undefined,
    workoutProvider: WORKOUT_PROVIDER,
    workoutSourceId: WORKOUT_PROVIDER,
    isSessionTransitionEnabled: false,
    segments: [
      {
        segmentOrder: 1,
        sport,
        steps: garminSteps
      }
    ]
  }
}

/**
 * Training API V2 `ownerId` is a Java Long (Garmin Connect numeric id).
 * Wellness `/user/id` returns a UUID — that must never be sent as ownerId.
 */
export function toGarminOwnerId(value: unknown): number | undefined {
  if (value == null) return undefined
  const raw = String(value).trim()
  if (!raw || !/^\d+$/.test(raw)) return undefined
  const asNumber = Number(raw)
  if (!Number.isSafeInteger(asNumber) || asNumber <= 0) return undefined
  return asNumber
}

function stripInvalidOwnerId(payload: Record<string, unknown>): Record<string, unknown> {
  const body = { ...payload }
  const ownerId = toGarminOwnerId(body.ownerId)
  if (ownerId != null) body.ownerId = ownerId
  else delete body.ownerId
  return body
}

async function fetchGarminWorkoutOwnerId(
  integration: Integration,
  workoutId: string
): Promise<number | undefined> {
  const response = await fetch(`${GARMIN_TRAINING_WORKOUT_V2}/${workoutId}`, {
    method: 'GET',
    headers: getGarminHeaders(integration.accessToken)
  })
  if (!response.ok) return undefined
  const workout = (await response.json().catch(() => null)) as { ownerId?: unknown } | null
  return toGarminOwnerId(workout?.ownerId)
}

export async function createGarminWorkout(integration: Integration, payload: any) {
  const validIntegration = await ensureValidToken(integration)
  // Create does not require ownerId. Never inject the wellness UUID.
  const numericExternalOwnerId = toGarminOwnerId(validIntegration.externalUserId)
  const body = stripInvalidOwnerId({
    ...(payload || {}),
    ...(numericExternalOwnerId != null ? { ownerId: numericExternalOwnerId } : {})
  })
  const headers = getGarminHeaders(validIntegration.accessToken)

  // Training API V2 docs list create on workoutportal; retrieve/update use training-api.
  // Prefer the documented create URL, then fall back if that host rejects the route.
  const createUrls = [GARMIN_TRAINING_WORKOUT_CREATE_V2, GARMIN_TRAINING_WORKOUT_V2]
  let lastError = 'unknown error'
  for (const url of createUrls) {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })
    if (response.ok) return response.json()
    const error = await response.text().catch(() => response.statusText)
    lastError = `(${response.status}): ${error}`
    if (response.status !== 404 && response.status !== 405) {
      throw new Error(`Garmin create workout failed ${lastError}`)
    }
  }

  throw new Error(`Garmin create workout failed ${lastError}`)
}

export async function updateGarminWorkout(
  integration: Integration,
  workoutId: string,
  payload: any
) {
  const validIntegration = await ensureValidToken(integration)
  let ownerId =
    toGarminOwnerId(payload?.ownerId) ?? toGarminOwnerId(validIntegration.externalUserId)

  // Wellness externalUserId is a UUID; resolve numeric ownerId from the existing workout.
  if (ownerId == null) {
    ownerId = await fetchGarminWorkoutOwnerId(validIntegration, workoutId)
  }

  if (ownerId == null) {
    const err = new Error(
      'Garmin update workout requires numeric ownerId (wellness UUID cannot be used)'
    ) as Error & { code?: string }
    err.code = 'GARMIN_OWNER_ID_REQUIRED'
    throw err
  }

  const body = stripInvalidOwnerId({ ...(payload || {}), ownerId })
  const response = await fetch(`${GARMIN_TRAINING_WORKOUT_V2}/${workoutId}`, {
    method: 'PUT',
    headers: getGarminHeaders(validIntegration.accessToken),
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const error = await response.text().catch(() => response.statusText)
    throw new Error(`Garmin update workout failed (${response.status}): ${error}`)
  }

  return { success: true }
}

export async function createGarminWorkoutSchedule(
  integration: Integration,
  payload: { workoutId: number | string; date: string }
) {
  const validIntegration = await ensureValidToken(integration)
  const response = await fetch(GARMIN_TRAINING_SCHEDULE, {
    method: 'POST',
    headers: getGarminHeaders(validIntegration.accessToken),
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const error = await response.text().catch(() => response.statusText)
    throw new Error(`Garmin create schedule failed (${response.status}): ${error}`)
  }

  return response.json()
}

export function extractGarminScheduleId(response: unknown): string {
  if (response == null) return ''
  if (typeof response === 'string' || typeof response === 'number') return String(response)
  if (typeof response === 'object') {
    const value = response as Record<string, unknown>
    const id = value.scheduleId ?? value.id ?? value.schedule_id
    if (id != null) return String(id)
  }
  return ''
}

export async function updateGarminWorkoutSchedule(
  integration: Integration,
  scheduleId: string,
  payload: { workoutId: number | string; date: string }
) {
  const validIntegration = await ensureValidToken(integration)
  const response = await fetch(`${GARMIN_TRAINING_SCHEDULE}/${scheduleId}`, {
    method: 'PUT',
    headers: getGarminHeaders(validIntegration.accessToken),
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const error = await response.text().catch(() => response.statusText)
    throw new Error(`Garmin update schedule failed (${response.status}): ${error}`)
  }

  return { success: true }
}

export function buildGarminCoursePayload(workout: any) {
  const points = Array.isArray(workout?.geoPoints) ? workout.geoPoints : []
  if (points.length < 2) {
    throw new Error('Course publish requires at least 2 geoPoints (lat/lng)')
  }

  return {
    courseName: workout.title,
    description: workout.description || '',
    distance: Number(workout.distanceMeters) || 0,
    elevationGain: Number(workout.elevationGain || 0),
    elevationLoss: Number(workout.elevationLoss || 0),
    activityType: mapCourseActivityToGarmin(workout.type),
    coordinateSystem: 'WGS84',
    geoPoints: points.map((p: any) => ({
      latitude: Number(p.latitude ?? p.lat),
      longitude: Number(p.longitude ?? p.lng),
      elevation: p.elevation != null ? Number(p.elevation) : undefined
    }))
  }
}

function mapCourseActivityToGarmin(type: string): string {
  const t = (type || '').toLowerCase()
  if (t.includes('run')) return 'RUNNING'
  if (t.includes('trail')) return 'TRAIL_RUNNING'
  if (t.includes('hike')) return 'HIKING'
  if (t.includes('mountain')) return 'MOUNTAIN_BIKING'
  if (t.includes('gravel')) return 'GRAVEL_CYCLING'
  if (t.includes('ride') || t.includes('cycle') || t.includes('bike')) return 'ROAD_CYCLING'
  return 'OTHER'
}

export async function createGarminCourse(integration: Integration, payload: any) {
  const validIntegration = await ensureValidToken(integration)
  const response = await fetch('https://apis.garmin.com/training-api/courses/v1/course', {
    method: 'POST',
    headers: getGarminHeaders(validIntegration.accessToken),
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const error = await response.text().catch(() => response.statusText)
    throw new Error(`Garmin create course failed (${response.status}): ${error}`)
  }

  return response.json()
}

/**
 * Map Coach Watts sport types to Training API V2 sport enums.
 * V2 single-segment sports: RUNNING, CYCLING, LAP_SWIMMING, STRENGTH_TRAINING,
 * CARDIO_TRAINING, GENERIC, YOGA, PILATES.
 */
function mapSportToGarmin(type: string): string {
  const normalized = String(type || '').trim()
  const map: Record<string, string> = {
    Run: 'RUNNING',
    TrailRun: 'RUNNING',
    Ride: 'CYCLING',
    VirtualRide: 'CYCLING',
    GravelRide: 'CYCLING',
    MountainBikeRide: 'CYCLING',
    Swim: 'LAP_SWIMMING',
    Strength: 'STRENGTH_TRAINING',
    WeightTraining: 'STRENGTH_TRAINING',
    Yoga: 'YOGA',
    Pilates: 'PILATES',
    Walk: 'GENERIC',
    Hike: 'GENERIC'
  }
  if (map[normalized]) return map[normalized]!

  const lower = normalized.toLowerCase()
  if (lower.includes('swim')) return 'LAP_SWIMMING'
  if (lower.includes('yoga')) return 'YOGA'
  if (lower.includes('pilates')) return 'PILATES'
  if (lower.includes('strength') || lower.includes('weight')) return 'STRENGTH_TRAINING'
  if (lower.includes('run')) return 'RUNNING'
  if (lower.includes('virtual') || lower.includes('ride') || lower.includes('bike')) {
    return 'CYCLING'
  }
  return 'GENERIC'
}
