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

function mapSportToGarmin(type: string): string {
  const map: Record<string, string> = {
    Run: 'RUNNING',
    Ride: 'CYCLING',
    Swim: 'LAP_SWIMMING'
  }
  return map[type] || 'GENERIC'
}
