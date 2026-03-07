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

  const response = await fetch('https://partner.ultrahuman.com/api/partners/oauth/token', {
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

/**
 * Fetches daily metrics from Ultrahuman
 * Based on docs: /api/partners/v1/user_data/metrics?date=YYYY-MM-DD
 * Alternatively: /api/v1/partner/daily_metrics?date=YYYY-MM-DD
 */
export async function fetchUltrahumanDaily(integration: Integration, date: Date) {
  const validIntegration = await ensureValidToken(integration)
  const dateStr = date.toISOString().split('T')[0]

  // The documentation mentions two possible endpoints, we'll try the specific metrics one first
  const response = await fetch(
    `https://partner.ultrahuman.com/api/partners/v1/user_data/metrics?date=${dateStr}`,
    {
      headers: {
        Authorization: `Bearer ${validIntegration.accessToken}`
      }
    }
  )

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

  const result = await response.json()
  // The data is usually wrapped in a 'data' field or 'metrics' field
  return result.data || result
}

export async function fetchUltrahumanProfile(tokenOrIntegration: string | Integration) {
  let accessToken: string
  if (typeof tokenOrIntegration === 'string') {
    accessToken = tokenOrIntegration
  } else {
    const validIntegration = await ensureValidToken(tokenOrIntegration)
    accessToken = validIntegration.accessToken
  }

  const response = await fetch(
    'https://partner.ultrahuman.com/api/partners/v1/user_data/user_info',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  )

  if (!response.ok) {
    throw new Error(`Ultrahuman API error: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

// --- Normalization ---

export function normalizeUltrahumanWellness(dailyData: any, userId: string, date: Date) {
  if (!dailyData) return null

  // Based on provided fields: sleep_score, total_sleep, sleep_efficiency, etc.
  // Note: Recovery score is often 'recovery_index' or 'morning_alertness' in their system
  const sleepScore = dailyData.sleep_score ?? null
  const sleepSecs = dailyData.total_sleep ?? null
  const sleepHours = sleepSecs ? Math.round((sleepSecs / 3600) * 10) / 10 : null

  const deepSecs = dailyData.deep_sleep ?? null
  const remSecs = dailyData.rem_sleep ?? null
  const lightSecs = dailyData.light_sleep ?? null

  // Biometrics
  const avgHrv = dailyData.hrv?.average ?? dailyData.hrv ?? null
  const restingHr = dailyData.resting_hr ?? null
  const bodyTemp = dailyData.average_body_temperature ?? null

  // Recovery/Readiness
  // Ultrahuman's 'morning_alertness' or 'restorative_sleep' can be used as readiness indicators
  const recoveryScore = dailyData.recovery_index ?? dailyData.morning_alertness ?? null
  const readiness = recoveryScore ? Math.round(recoveryScore / 10) : null

  // Movement
  const steps = dailyData.steps ?? null
  const distance = dailyData.distance ?? null

  return {
    userId,
    date,
    hrv: avgHrv,
    restingHr: restingHr ? Math.round(restingHr) : null,
    sleepSecs,
    sleepHours,
    sleepScore,
    sleepDeepSecs: deepSecs,
    sleepRemSecs: remSecs,
    sleepLightSecs: lightSecs,
    readiness,
    recoveryScore,
    skinTemp: bodyTemp,
    totalCaloriesBurned: dailyData.total_calories || null,
    activeCaloriesBurned: dailyData.active_calories || null,
    rawJson: dailyData,
    comments:
      `Ultrahuman: ${steps ? steps + ' steps' : ''}${distance ? ', ' + (distance / 1000).toFixed(1) + 'km' : ''}`.trim()
  }
}
