import type { Integration } from '@prisma/client'

export interface UltrahumanSettings {
  autoSync: boolean
  preferredSyncTime: string // HH:mm format, e.g., "08:00"
  ingestWellness: boolean
}

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

    // If we get a 400 Bad Request during refresh, it typically means the refresh token is invalid/revoked
    if (response.status === 400) {
      const { prisma: db } = await import('./db')
      await db.integration.update({
        where: { id: integration.id },
        data: {
          syncStatus: 'FAILED',
          errorMessage: `Refresh token revoked or invalid: ${errorText}`
        }
      })
    }

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
 */
export async function fetchUltrahumanDaily(integration: Integration, date: Date) {
  const validIntegration = await ensureValidToken(integration)
  const dateStr = date.toISOString().split('T')[0]

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
  return result
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
  if (dailyData?.data) {
    dailyData = dailyData.data
  }

  if (!dailyData || !dailyData.metric_data || !Array.isArray(dailyData.metric_data)) return null

  const metrics: Record<string, any> = {}
  for (const item of dailyData.metric_data) {
    if (item.type && item.object) {
      metrics[item.type] = item.object
    }
  }

  // Sleep Data (Capital S!)
  const sleepObj = metrics['Sleep'] || {}
  const sleepScore = sleepObj.score_trend?.day_avg ?? null

  let sleepSecs = null
  let sleepDeepSecs = null
  let sleepRemSecs = null
  let sleepLightSecs = null
  let sleepAwakeSecs = null

  if (sleepObj.quick_metrics) {
    const totalSleepMetric = sleepObj.quick_metrics.find((m: any) => m.type === 'total_sleep')
    if (totalSleepMetric) {
      sleepSecs = totalSleepMetric.value
    }
  }

  if (sleepObj.sleep_stages) {
    sleepDeepSecs =
      sleepObj.sleep_stages.find((s: any) => s.type === 'deep_sleep')?.stage_time ?? null
    sleepRemSecs =
      sleepObj.sleep_stages.find((s: any) => s.type === 'rem_sleep')?.stage_time ?? null
    sleepLightSecs =
      sleepObj.sleep_stages.find((s: any) => s.type === 'light_sleep')?.stage_time ?? null
    sleepAwakeSecs = sleepObj.sleep_stages.find((s: any) => s.type === 'awake')?.stage_time ?? null
  }

  const sleepHours = sleepSecs ? Math.round((sleepSecs / 3600) * 10) / 10 : null

  // HRV
  // Prefer avg_sleep_hrv if available, otherwise hrv.avg
  const hrv = metrics['avg_sleep_hrv']?.value ?? metrics['hrv']?.avg ?? null

  // Resting HR
  // Prefer night_rhr or sleep_rhr
  const restingHr =
    metrics['night_rhr']?.avg ?? metrics['sleep_rhr']?.value ?? metrics['hr']?.last_reading ?? null

  // Recovery/Readiness
  const recoveryScore = metrics['recovery_index']?.value ?? null
  const readiness = recoveryScore ? Math.round(recoveryScore / 10) : null

  // Body Temp
  const skinTemp = metrics['temp']?.gist_object?.avg ?? metrics['temp']?.last_reading ?? null

  // Movement
  const steps = metrics['steps']?.total ?? null
  // Note: distance and calories not found in sample payload but keeping as fallbacks
  const distance = metrics['distance']?.total ?? null

  // VO2 Max
  const vo2max = metrics['vo2_max']?.value ?? null

  // If we have no significant data, return null to avoid creating empty records
  if (!hrv && !restingHr && !sleepSecs && !sleepScore && !recoveryScore && !steps) {
    return null
  }

  return {
    userId,
    date,
    hrv,
    restingHr: restingHr ? Math.round(restingHr) : null,
    sleepSecs,
    sleepHours,
    sleepScore,
    sleepDeepSecs,
    sleepRemSecs,
    sleepLightSecs,
    sleepAwakeSecs,
    readiness,
    recoveryScore,
    skinTemp,
    vo2max,
    totalCaloriesBurned: metrics['calories']?.total || null,
    activeCaloriesBurned: metrics['calories']?.active || null,
    rawJson: dailyData,
    comments:
      `Ultrahuman: ${steps ? steps + ' steps' : ''}${distance ? ', ' + (distance / 1000).toFixed(1) + 'km' : ''}`.trim()
  }
}
