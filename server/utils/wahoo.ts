import type { Integration } from '@prisma/client'
import { prisma } from './db'

interface WahooTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
  created_at: number
}

interface WahooUser {
  id: number
  height: string
  weight: string
  first: string
  last: string
  email: string
  birth: string
  gender: number
  created_at: string
  updated_at: string
}

interface WahooWorkoutSummary {
  id: number
  name: string
  ascent_accum: string
  cadence_avg: string
  calories_accum: string
  distance_accum: string
  duration_active_accum: string
  duration_paused_accum: string
  duration_total_accum: string
  heart_rate_avg: string
  power_avg: string
  power_bike_np_last: string
  power_bike_tss_last: string
  speed_avg: string
  work_accum: string
  time_zone: string
  manual: boolean
  edited: boolean
  fitness_app_id: number
  file?: {
    url: string
  }
  created_at: string
  updated_at: string
}

interface WahooWorkout {
  id: number
  starts: string
  minutes: number
  name: string
  plan_id: number | null
  plan_ids: number[]
  route_id: number | null
  workout_token: string
  workout_type_id: number
  workout_summary: WahooWorkoutSummary | null
  created_at: string
  updated_at: string
}

/**
 * Refreshes an expired Wahoo access token
 */
export async function refreshWahooToken(integration: Integration): Promise<Integration> {
  if (!integration.refreshToken) {
    throw new Error('No refresh token available for Wahoo integration')
  }

  const clientId = process.env.WAHOO_CLIENT_ID
  const clientSecret = process.env.WAHOO_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Wahoo credentials not configured')
  }

  console.log('[Wahoo] Refreshing token for integration:', integration.id)

  const response = await fetch('https://api.wahooligan.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: integration.refreshToken
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Wahoo] Token refresh failed:', errorText)
    throw new Error(`Failed to refresh Wahoo token: ${response.status} ${response.statusText}`)
  }

  const tokenData: WahooTokenResponse = await response.json()
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

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
 * Ensures the integration has a valid access token, refreshing if necessary
 */
async function ensureValidToken(integration: Integration): Promise<Integration> {
  if (!integration.expiresAt || integration.expiresAt.getTime() <= Date.now() + 5 * 60 * 1000) {
    return await refreshWahooToken(integration)
  }
  return integration
}

/**
 * Fetch Wahoo user profile
 */
export async function fetchWahooUser(tokenOrIntegration: string | Integration): Promise<WahooUser> {
  let accessToken: string

  if (typeof tokenOrIntegration === 'string') {
    accessToken = tokenOrIntegration
  } else {
    const validIntegration = await ensureValidToken(tokenOrIntegration)
    accessToken = validIntegration.accessToken
  }

  const response = await fetch('https://api.wahooligan.com/v1/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Wahoo API error: ${response.status} ${errorText}`)
  }

  return await response.json()
}

/**
 * Fetch Wahoo workouts for a given page
 */
export async function fetchWahooWorkouts(
  integration: Integration,
  page = 1,
  perPage = 30
): Promise<{ workouts: WahooWorkout[]; total: number }> {
  const validIntegration = await ensureValidToken(integration)

  const url = new URL('https://api.wahooligan.com/v1/workouts')
  url.searchParams.set('page', page.toString())
  url.searchParams.set('per_page', perPage.toString())

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${validIntegration.accessToken}`
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Wahoo API error: ${response.status} ${errorText}`)
  }

  return await response.json()
}

/**
 * Normalize Wahoo workout to our Workout model
 */
export function normalizeWahooWorkout(workout: WahooWorkout, userId: string) {
  const summary = workout.workout_summary

  // Map Wahoo workout_type_id to our types
  // 0: Biking, 1: Running, etc. (Need to verify others, but these are the main ones)
  const typeMapping: Record<number, string> = {
    0: 'Ride',
    1: 'Run',
    2: 'Swim',
    3: 'Hike',
    4: 'Walk',
    11: 'Gym',
    12: 'Yoga'
  }

  const normalizedType = typeMapping[workout.workout_type_id] || 'Other'

  if (!summary) {
    // Return a minimal workout if no summary is available
    return {
      userId,
      externalId: String(workout.id),
      source: 'wahoo',
      date: new Date(workout.starts),
      title: workout.name || 'Wahoo Workout',
      type: normalizedType,
      durationSec: Math.round(workout.minutes * 60),
      rawJson: workout as any
    }
  }

  return {
    userId,
    externalId: String(workout.id),
    source: 'wahoo',
    date: new Date(workout.starts),
    title: summary.name || workout.name || 'Wahoo Workout',
    type: normalizedType,
    durationSec: summary.duration_active_accum
      ? Math.round(parseFloat(summary.duration_active_accum))
      : Math.round(workout.minutes * 60),
    distanceMeters: summary.distance_accum ? parseFloat(summary.distance_accum) : null,
    elevationGain: summary.ascent_accum ? Math.round(parseFloat(summary.ascent_accum)) : null,

    // Power metrics
    averageWatts: summary.power_avg ? Math.round(parseFloat(summary.power_avg)) : null,
    normalizedPower: summary.power_bike_np_last
      ? Math.round(parseFloat(summary.power_bike_np_last))
      : null,
    weightedAvgWatts: summary.power_bike_np_last
      ? Math.round(parseFloat(summary.power_bike_np_last))
      : null,

    // Heart rate
    averageHr: summary.heart_rate_avg ? Math.round(parseFloat(summary.heart_rate_avg)) : null,

    // Cadence
    averageCadence: summary.cadence_avg ? Math.round(parseFloat(summary.cadence_avg)) : null,

    // Speed
    averageSpeed: summary.speed_avg ? parseFloat(summary.speed_avg) : null,

    // Training load metrics
    tss: summary.power_bike_tss_last ? Math.round(parseFloat(summary.power_bike_tss_last)) : null,
    kilojoules: summary.work_accum ? Math.round(parseFloat(summary.work_accum) / 1000) : null,

    // Environmental
    trainer: null, // Wahoo doesn't specify in summary

    // Energy & Time
    calories: summary.calories_accum ? Math.round(parseFloat(summary.calories_accum)) : null,
    elapsedTimeSec: summary.duration_total_accum
      ? Math.round(parseFloat(summary.duration_total_accum))
      : null,

    // Store raw data
    rawJson: workout as any
  }
}
