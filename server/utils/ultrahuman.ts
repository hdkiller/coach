import type { Integration } from '@prisma/client'

interface UltrahumanTokenResponse {
  access_token: string
  expires_in: number
  refresh_token: string
  scope: string
  token_type: string
}

/**
 * Refreshes an expired Ultrahuman access token using the refresh token
 */
export async function refreshUltrahumanToken(integration: Integration): Promise<Integration> {
  if (!integration.refreshToken) {
    throw new Error('No refresh token available for Ultrahuman integration')
  }

  const clientId = process.env.ULTRAHUMAN_CLIENT_ID
  const clientSecret = process.env.ULTRAHUMAN_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Ultrahuman credentials not configured')
  }

  console.log('Refreshing Ultrahuman token for integration:', integration.id)

  const response = await fetch('https://vision.ultrahuman.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: integration.refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    }).toString()
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Ultrahuman token refresh failed:', errorText)
    throw new Error(`Failed to refresh Ultrahuman token: ${response.status} ${response.statusText}`)
  }

  const tokenData: UltrahumanTokenResponse = await response.json()
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)
  const { prisma } = await import('./db')

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
    return false // If no expiry is set, assume it's valid
  }

  const now = new Date()
  const expiryWithBuffer = new Date(integration.expiresAt.getTime() - 5 * 60 * 1000) // 5 minutes buffer
  return now >= expiryWithBuffer
}

/**
 * Ensures the integration has a valid access token, refreshing if necessary
 */
async function ensureValidToken(integration: Integration): Promise<Integration> {
  if (isTokenExpired(integration)) {
    console.log('Ultrahuman token expired or expiring soon, refreshing...')
    return await refreshUltrahumanToken(integration)
  }
  return integration
}

// --- Data Fetching ---

export async function fetchUltrahumanDaily(integration: Integration, date: Date) {
  const validIntegration = await ensureValidToken(integration)
  const dateStr = date.toISOString().split('T')[0]

  const response = await fetch(`https://api.ultrahuman.com/v1/vision/daily?date=${dateStr}`, {
    headers: {
      Authorization: `Bearer ${validIntegration.accessToken}`
    }
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      console.warn(`[Ultrahuman] Unauthorized access to daily data.`)
      return null
    }
    if (response.status === 404) {
      return null // No data for this date
    }

    const errorText = await response.text()
    console.error(`[Ultrahuman] API Error (daily):`, {
      status: response.status,
      statusText: response.statusText,
      error: errorText
    })
    throw new Error(`Ultrahuman API error: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

export async function fetchUltrahumanProfile(tokenOrIntegration: string | Integration) {
  let accessToken: string
  if (typeof tokenOrIntegration === 'string') {
    accessToken = tokenOrIntegration
  } else {
    const validIntegration = await ensureValidToken(tokenOrIntegration)
    accessToken = validIntegration.accessToken
  }

  const response = await fetch('https://api.ultrahuman.com/v1/vision/profile', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    throw new Error(`Ultrahuman API error: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

// --- Normalization ---

export function normalizeUltrahumanWellness(dailyData: any, userId: string, date: Date) {
  if (!dailyData) return null

  const scores = dailyData.scores || {}
  const metrics = dailyData.metrics || {}
  const sleep = metrics.sleep || {}
  const heartRate = metrics.heart_rate || {}
  const movement = metrics.movement || {}
  const biometrics = metrics.biometrics || {}

  // Recovery Score (0-100 to 1-10)
  const recoveryScore = scores.recovery_score ? Math.round(scores.recovery_score) : null
  const readiness = recoveryScore ? Math.round(recoveryScore / 10) : null

  // Sleep Metrics
  const sleepSecs = sleep.total_sleep_duration || null
  const sleepHours = sleepSecs ? Math.round((sleepSecs / 3600) * 10) / 10 : null
  const sleepScore = scores.sleep_index || null

  const sleepDeepSecs = sleep.stages?.deep ?? null
  const sleepRemSecs = sleep.stages?.rem ?? null
  const sleepLightSecs = sleep.stages?.light ?? null
  const sleepAwakeSecs = sleep.stages?.awake ?? null

  // Biometrics
  const restingHr = heartRate.resting_hr || null
  const avgHrv = heartRate.hrv || null

  // Movement/Activity
  const steps = movement.steps || null
  const distance = movement.distance || null

  return {
    userId,
    date,
    hrv: avgHrv,
    restingHr: restingHr ? Math.round(restingHr) : null,
    avgSleepingHr: heartRate.avg_hr || null,
    sleepSecs,
    sleepHours,
    sleepScore,
    sleepDeepSecs,
    sleepRemSecs,
    sleepLightSecs,
    sleepAwakeSecs,
    readiness,
    recoveryScore,
    stress: null,
    weight: metrics.weight || null,
    spO2: biometrics.spo2 || null,
    respiration: biometrics.respiration || null,
    skinTemp: biometrics.skin_temperature || null,
    vo2max: metrics.vo2_max || null,
    totalCaloriesBurned: movement.total_calories || null,
    activeCaloriesBurned: movement.active_calories || null,
    rawJson: dailyData,
    comments:
      `Ultrahuman: ${steps ? steps + ' steps' : ''}${distance ? ', ' + (distance / 1000).toFixed(1) + 'km' : ''}`.trim()
  }
}
