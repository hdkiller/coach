import type { Integration } from '@prisma/client'
import { prisma } from './db'

interface RouvyTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at: number
}

/**
 * Refreshes an expired ROUVY access token using the refresh token
 */
export async function refreshRouvyToken(integration: Integration): Promise<Integration> {
  if (!integration.refreshToken) {
    throw new Error('No refresh token available for ROUVY integration')
  }

  const clientId = process.env.ROUVY_CLIENT_ID
  const clientSecret = process.env.ROUVY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('ROUVY credentials not configured')
  }

  console.log('Refreshing ROUVY token for integration:', integration.id)

  const formData = new URLSearchParams()
  formData.append('client_id', clientId)
  formData.append('client_secret', clientSecret)
  formData.append('grant_type', 'refresh_token')
  formData.append('refresh_token', integration.refreshToken)

  const response = await fetch('https://api.rouvy.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('ROUVY token refresh failed:', errorText)
    throw new Error(`Failed to refresh ROUVY token: ${response.status} ${response.statusText}`)
  }

  const tokenData: RouvyTokenResponse = await response.json()

  // Robust expiresAt calculation
  let expiresAt: Date
  if (tokenData.expires_at) {
    expiresAt = new Date(tokenData.expires_at * 1000)
  } else if (tokenData.expires_in) {
    expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)
  } else {
    // Default to 1 hour if both missing
    expiresAt = new Date(Date.now() + 3600 * 1000)
  }

  // Update the integration in the database
  const updatedIntegration = await prisma.integration.update({
    where: { id: integration.id },
    data: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt
    }
  })

  return updatedIntegration
}

/**
 * Checks if a token is expired or about to expire (within 5 minutes)
 */
function isTokenExpired(integration: Integration): boolean {
  if (!integration.expiresAt) {
    return false
  }

  const now = new Date()
  const expiryWithBuffer = new Date(integration.expiresAt.getTime() - 5 * 60 * 1000)
  return now >= expiryWithBuffer
}

/**
 * Ensures the integration has a valid access token, refreshing if necessary
 */
async function ensureValidToken(integration: Integration): Promise<Integration> {
  if (isTokenExpired(integration)) {
    console.log('ROUVY token expired or expiring soon, refreshing...')
    return await refreshRouvyToken(integration)
  }
  return integration
}

interface RouvyAggregate {
  min: number
  max: number
  avg: number
}

interface RouvyAggregates {
  powerWatts: RouvyAggregate
  heartRateBPM: RouvyAggregate
  speedMetersPerSecond: RouvyAggregate
  altitudeMeters: RouvyAggregate
  cadenceRPM: RouvyAggregate
}

interface RouvyActivity {
  activityId: string
  activityType: 'activity' | 'workout' | 'race' | 'groupRide'
  sessionId: string | null
  routeId: string | null
  workoutId: string | null
  activityTitle: string
  startDateUTC: string
  hourOffset: number
  elapsedTimeSeconds: number
  movingTimeSeconds: number
  distanceMeters: number
  elevationGainMeters: number
  energyKcal: number
  normalizedPowerWatts: number
  intensityFactor: number
  trainingStressScore: number
  aggregates: RouvyAggregates
}

/**
 * Fetch ROUVY activities for a date range
 */
export async function fetchRouvyActivities(
  integration: Integration,
  fromDateTime?: string,
  toDateTime?: string,
  limit: number = 50,
  offset: number = 0
): Promise<RouvyActivity[]> {
  const validIntegration = await ensureValidToken(integration)

  const url = new URL('https://api.rouvy.com/activities')
  if (fromDateTime) url.searchParams.set('fromDateTime', fromDateTime)
  if (toDateTime) url.searchParams.set('toDateTime', toDateTime)
  url.searchParams.set('limit', limit.toString())
  url.searchParams.set('offset', offset.toString())

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${validIntegration.accessToken}`
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('ROUVY API Error Response:', errorText)
    throw new Error(`ROUVY API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data.activities
}

/**
 * Fetch detailed activity
 */
export async function fetchRouvyActivityDetails(
  integration: Integration,
  activityId: string
): Promise<RouvyActivity> {
  const validIntegration = await ensureValidToken(integration)

  const response = await fetch(`https://api.rouvy.com/activities/${activityId}`, {
    headers: {
      Authorization: `Bearer ${validIntegration.accessToken}`
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`ROUVY API error: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return data.activity
}

/**
 * Fetch activity FIT file
 */
export async function fetchRouvyActivityFitFile(
  integration: Integration,
  activityId: string
): Promise<Buffer> {
  const validIntegration = await ensureValidToken(integration)

  const response = await fetch(`https://api.rouvy.com/activities/${activityId}/fit`, {
    headers: {
      Authorization: `Bearer ${validIntegration.accessToken}`
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`ROUVY API error: ${response.status} ${errorText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Push workout to ROUVY
 */
export async function pushRouvyWorkout(
  integration: Integration,
  plannedAt: string,
  zwoContent: string,
  filename: string = 'workout.zwo'
): Promise<any> {
  const validIntegration = await ensureValidToken(integration)

  const formData = new FormData()
  formData.append('plannedAt', plannedAt)

  const blob = new Blob([zwoContent], { type: 'application/octet-stream' })
  formData.append('file', blob, filename)

  const response = await fetch('https://api.rouvy.com/workouts/push', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${validIntegration.accessToken}`
    },
    body: formData
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`ROUVY API error: ${response.status} ${errorText}`)
  }

  return await response.json()
}

/**
 * Normalize ROUVY activity to our Workout model
 */
export function normalizeRouvyActivity(activity: RouvyActivity, userId: string) {
  return {
    userId,
    externalId: activity.activityId,
    source: 'rouvy',
    date: new Date(activity.startDateUTC),
    title: activity.activityTitle,
    description: `ROUVY ${activity.activityType} on route ${activity.routeId || 'unknown'}`,
    type: 'VirtualRide',
    durationSec: activity.movingTimeSeconds,
    distanceMeters: activity.distanceMeters,
    elevationGain: Math.round(activity.elevationGainMeters),

    // Power metrics
    averageWatts: Math.round(activity.aggregates.powerWatts.avg),
    maxWatts: Math.round(activity.aggregates.powerWatts.max),
    normalizedPower: Math.round(activity.normalizedPowerWatts),
    weightedAvgWatts: Math.round(activity.normalizedPowerWatts),

    // Heart rate
    averageHr: Math.round(activity.aggregates.heartRateBPM.avg),
    maxHr: Math.round(activity.aggregates.heartRateBPM.max),

    // Cadence
    averageCadence: Math.round(activity.aggregates.cadenceRPM.avg),
    maxCadence: Math.round(activity.aggregates.cadenceRPM.max),

    // Speed
    averageSpeed: activity.aggregates.speedMetersPerSecond.avg,

    // Training load metrics
    tss: activity.trainingStressScore,
    trainingLoad: activity.trainingStressScore, // Using TSS as training load
    intensity: activity.intensityFactor,
    energyKcal: activity.energyKcal,

    // Metadata
    rawJson: activity as any
  }
}
