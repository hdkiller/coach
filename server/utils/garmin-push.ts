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

/**
 * Draft for pushing a structured workout to Garmin.
 * This should be integrated into the planning service.
 */
export async function syncWorkoutToGarmin(integration: Integration, workout: any) {
  const validIntegration = await ensureValidToken(integration)

  // Map Coach Watts structured steps to Garmin Workout format
  const garminWorkout = {
    workoutName: workout.title,
    sport: mapSportToGarmin(workout.type),
    steps: workout.steps.map((step: any, index: number) => ({
      stepOrder: index + 1,
      intensity:
        step.type === 'warmup' ? 'WARMUP' : step.type === 'cooldown' ? 'COOLDOWN' : 'INTERVAL',
      durationType: 'TIME',
      durationValue: step.durationSec,
      targetType: step.targetType === 'power' ? 'POWER' : 'OPEN',
      targetValueLow: step.targetLow,
      targetValueHigh: step.targetHigh
    }))
  }

  const response = await fetch('https://apis.garmin.com/training-api/workout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${validIntegration.accessToken}`
    },
    body: JSON.stringify(garminWorkout)
  })

  if (!response.ok) {
    throw new Error(`Failed to push workout to Garmin: ${response.statusText}`)
  }

  return await response.json()
}

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
  if (type.includes('rest') || type.includes('recover')) return 'REST'
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

function getTarget(step: any): {
  targetType: string
  targetValue?: number
  targetValueLow?: number
  targetValueHigh?: number
} {
  const power = step?.power
  const hr = step?.heartRate
  const pace = step?.pace
  const cadence = step?.cadence

  if (power?.range) {
    return {
      targetType: 'POWER',
      targetValueLow: Number(power.range.start) || 0,
      targetValueHigh: Number(power.range.end) || 0
    }
  }
  if (typeof power?.value === 'number') {
    return { targetType: 'POWER', targetValue: power.value }
  }

  if (hr?.range) {
    return {
      targetType: 'HEART_RATE',
      targetValueLow: Number(hr.range.start) || 0,
      targetValueHigh: Number(hr.range.end) || 0
    }
  }
  if (typeof hr?.value === 'number') {
    return { targetType: 'HEART_RATE', targetValue: hr.value }
  }

  if (pace?.range) {
    return {
      targetType: 'PACE',
      targetValueLow: Number(pace.range.start) || 0,
      targetValueHigh: Number(pace.range.end) || 0
    }
  }
  if (typeof pace?.value === 'number') {
    return { targetType: 'PACE', targetValue: pace.value }
  }

  if (typeof cadence === 'number') {
    return { targetType: 'CADENCE', targetValue: cadence }
  }

  return { targetType: 'OPEN' }
}

function explodeSteps(steps: any[]): any[] {
  const out: any[] = []

  const visit = (step: any) => {
    if (!step) return
    const repsRaw = Number(step.reps ?? step.repeat ?? step.intervals ?? 1)
    const reps = Number.isFinite(repsRaw) && repsRaw > 0 ? Math.floor(repsRaw) : 1

    if (Array.isArray(step.steps) && step.steps.length > 0) {
      for (let i = 0; i < reps; i++) {
        for (const nested of step.steps) visit(nested)
      }
      return
    }

    for (let i = 0; i < reps; i++) out.push(step)
  }

  for (const step of steps || []) visit(step)
  return out
}

export function buildGarminTrainingPayload(workout: any) {
  const steps = explodeSteps(workout?.steps || [])

  return {
    workoutName: workout.title,
    description: workout.description || '',
    sport: mapSportToGarmin(workout.type),
    estimatedDurationInSecs: Number(workout.durationSec) || undefined,
    estimatedDistanceInMeters: Number(workout.distanceMeters) || undefined,
    workoutProvider: 'COACH_WATTZ',
    steps: steps.map((step: any, index: number) => {
      const durationType = getDurationType(step)
      const durationValue = getDurationValue(step)
      const target = getTarget(step)
      return {
        stepOrder: index + 1,
        type: 'WorkoutStep',
        intensity: mapStepIntensity(step.type || ''),
        description: step.name || undefined,
        durationType,
        durationValue: durationValue > 0 ? durationValue : undefined,
        ...target
      }
    })
  }
}

export async function createGarminWorkout(integration: Integration, payload: any) {
  const validIntegration = await ensureValidToken(integration)
  const response = await fetch('https://apis.garmin.com/training-api/workout', {
    method: 'POST',
    headers: getGarminHeaders(validIntegration.accessToken),
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const error = await response.text().catch(() => response.statusText)
    throw new Error(`Garmin create workout failed (${response.status}): ${error}`)
  }

  return response.json()
}

export async function updateGarminWorkout(
  integration: Integration,
  workoutId: string,
  payload: any
) {
  const validIntegration = await ensureValidToken(integration)
  const response = await fetch(`https://apis.garmin.com/training-api/workout/${workoutId}`, {
    method: 'PUT',
    headers: getGarminHeaders(validIntegration.accessToken),
    body: JSON.stringify(payload)
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
  const response = await fetch('https://apis.garmin.com/training-api/schedule', {
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

export async function updateGarminWorkoutSchedule(
  integration: Integration,
  scheduleId: string,
  payload: { workoutId: number | string; date: string }
) {
  const validIntegration = await ensureValidToken(integration)
  const response = await fetch(`https://apis.garmin.com/training-api/schedule/${scheduleId}`, {
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

function mapSportToGarmin(type: string): string {
  const map: Record<string, string> = {
    Run: 'RUNNING',
    Ride: 'CYCLING',
    Swim: 'LAP_SWIMMING'
  }
  return map[type] || 'GENERIC'
}
