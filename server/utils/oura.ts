import type { Integration } from '@prisma/client'
import { prisma } from './db'
import { IntegrationAuthError, IntegrationProviderError } from './integration-errors'

interface OuraTokenResponse {
  access_token: string
  expires_in: number
  refresh_token: string
  scope: string
  token_type: string
}

interface OuraTokenErrorPayload {
  status?: number
  error?: string
  error_description?: string
  message?: string
}

const OURA_TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000
const OURA_TOKEN_TRANSACTION_TIMEOUT_MS = 20_000
const OURA_RECONNECT_MESSAGE = 'Oura authorization expired or was revoked. Please reconnect Oura.'

const OURA_UNRECOVERABLE_REFRESH_ERRORS = new Set([
  'invalid_request',
  'invalid_grant',
  'invalid_client',
  'unauthorized_client',
  'unsupported_grant_type'
])

function parseOuraTokenErrorPayload(errorText: string): OuraTokenErrorPayload {
  try {
    return JSON.parse(errorText) as OuraTokenErrorPayload
  } catch {
    return {}
  }
}

function extractOuraRefreshErrorCode(payload: OuraTokenErrorPayload): string | undefined {
  if (typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error.trim()
  }
  return undefined
}

function isUnrecoverableOuraRefreshFailure(
  status: number,
  payload: OuraTokenErrorPayload
): boolean {
  if (status === 401) return true
  if (status !== 400) return false

  const errorCode = extractOuraRefreshErrorCode(payload)?.toLowerCase()
  if (!errorCode) {
    // Oura often returns bare invalid_request / "Invalid request" for revoked tokens.
    return true
  }
  return OURA_UNRECOVERABLE_REFRESH_ERRORS.has(errorCode)
}

function throwOuraAuthRevoked(integrationId: string, statusCode?: number): never {
  throw new IntegrationAuthError({
    provider: 'oura',
    integrationId,
    code: 'AUTH_REVOKED',
    statusCode,
    message: OURA_RECONNECT_MESSAGE
  })
}

/**
 * Refreshes an expired Oura access token using the refresh token.
 * Serializes concurrent refreshes for one integration via a DB row lock so webhook
 * fan-out (Promise.all of multiple endpoints) cannot stampede Oura with duplicate refreshes.
 */
export async function refreshOuraToken(integration: Integration): Promise<Integration> {
  const clientId = process.env.OURA_CLIENT_ID
  const clientSecret = process.env.OURA_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('OURA credentials not configured')
  }

  const result = await prisma.$transaction(
    async (transaction) => {
      await transaction.$queryRaw`SELECT "id" FROM "Integration" WHERE "id" = ${integration.id} FOR UPDATE`

      const latest = await transaction.integration.findUnique({
        where: { id: integration.id }
      })
      if (!latest) {
        throw new Error('Oura integration no longer exists')
      }

      // A caller that waited for the lock must reuse credentials written by the winner.
      if (
        latest.accessToken !== integration.accessToken ||
        latest.refreshToken !== integration.refreshToken
      ) {
        return { integration: latest }
      }

      if (latest.syncStatus === 'FAILED' && latest.errorMessage === OURA_RECONNECT_MESSAGE) {
        return { authRevoked: true as const, statusCode: 400 }
      }

      if (!latest.refreshToken) {
        throw new IntegrationAuthError({
          provider: 'oura',
          integrationId: integration.id,
          code: 'AUTH_MISSING',
          message: 'No refresh token available for Oura integration'
        })
      }

      console.log('Refreshing Oura token for integration:', integration.id)

      const response = await fetch('https://api.ouraring.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: latest.refreshToken,
          client_id: clientId,
          client_secret: clientSecret
        }).toString()
      })

      if (!response.ok) {
        const errorText = await response.text()
        const payload = parseOuraTokenErrorPayload(errorText)
        const errorCode = extractOuraRefreshErrorCode(payload)

        // Log diagnostics without request/response secrets (tokens never appear here).
        console.error('Oura token refresh failed:', {
          integrationId: integration.id,
          status: response.status,
          error: errorCode || undefined,
          errorDescription:
            typeof payload.error_description === 'string' ? payload.error_description : undefined
        })

        if (isUnrecoverableOuraRefreshFailure(response.status, payload)) {
          try {
            await transaction.integration.update({
              where: { id: integration.id },
              data: {
                syncStatus: 'FAILED',
                errorMessage: OURA_RECONNECT_MESSAGE
              }
            })
          } catch (updateError) {
            console.error('[Oura] Failed to mark integration as reconnect required', {
              integrationId: integration.id,
              updateError
            })
          }

          // Commit FAILED status before surfacing the auth error to callers.
          return { authRevoked: true as const, statusCode: response.status }
        }

        if (response.status >= 500) {
          throw new IntegrationProviderError({
            provider: 'oura',
            integrationId: integration.id,
            statusCode: response.status,
            message: `Oura token refresh unavailable: ${response.status} ${response.statusText}`
          })
        }

        throw new Error(
          `Failed to refresh Oura token: ${response.status} ${response.statusText}${
            errorCode ? ` (${errorCode})` : ''
          }`
        )
      }

      const tokenData: OuraTokenResponse = await response.json()
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

      const updated = await transaction.integration.update({
        where: { id: integration.id },
        data: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt
        }
      })
      return { integration: updated }
    },
    { maxWait: OURA_TOKEN_TRANSACTION_TIMEOUT_MS, timeout: OURA_TOKEN_TRANSACTION_TIMEOUT_MS }
  )

  if ('authRevoked' in result) {
    throwOuraAuthRevoked(integration.id, result.statusCode)
  }

  return result.integration
}

/**
 * Checks if a token is expired or about to expire (within 5 minutes)
 */
function isTokenExpired(integration: Integration): boolean {
  if (!integration.expiresAt) {
    return false // If no expiry is set, assume it's valid
  }

  const now = new Date()
  const expiryWithBuffer = new Date(integration.expiresAt.getTime() - OURA_TOKEN_REFRESH_BUFFER_MS)
  return now >= expiryWithBuffer
}

/**
 * Ensures the integration has a valid access token, refreshing if necessary.
 * Re-reads the DB first so parallel webhook fetchers can reuse a just-rotated token.
 */
export async function ensureValidOuraToken(integration: Integration): Promise<Integration> {
  const latest = await prisma.integration.findUnique({
    where: { id: integration.id }
  })
  if (!latest) return integration

  if (isTokenExpired(latest)) {
    console.log('Oura token expired or expiring soon, refreshing...')
    return await refreshOuraToken(latest)
  }
  return latest
}

async function ensureValidToken(integration: Integration): Promise<Integration> {
  return ensureValidOuraToken(integration)
}

// --- Data Fetching ---

export async function fetchOuraData(
  integration: Integration,
  endpoint: string,
  startDate: Date,
  endDate: Date
) {
  const validIntegration = await ensureValidToken(integration)

  const url = new URL(`https://api.ouraring.com/v2/usercollection/${endpoint}`)
  // Oura expects YYYY-MM-DD for most daily endpoints, but ISO for others.
  // The spec says "start_date" and "end_date" can be date or date-time.
  // For daily collections, date string 'YYYY-MM-DD' is usually best.
  // We'll use YYYY-MM-DD part of ISO string.
  url.searchParams.set('start_date', startDate.toISOString().split('T')[0]!)
  url.searchParams.set('end_date', endDate.toISOString().split('T')[0]!)

  const allRecords: any[] = []
  let nextToken: string | undefined

  do {
    if (nextToken) {
      url.searchParams.set('next_token', nextToken)
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${validIntegration.accessToken}`
      }
    })

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        console.warn(`[Oura] Skipping ${endpoint}: Token not authorized (check scopes).`)
        return []
      }
      if (response.status === 404) {
        return [] // No data for this endpoint/period
      }

      const errorText = await response.text()
      console.error(`[Oura] API Error (${endpoint}):`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      throw new Error(`Oura API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    allRecords.push(...(data.data || [])) // Oura V2 usually wraps list in 'data'
    nextToken = data.next_token
  } while (nextToken)

  return allRecords
}

export async function fetchOuraDailySleep(
  integration: Integration,
  startDate: Date,
  endDate: Date
) {
  return fetchOuraData(integration, 'daily_sleep', startDate, endDate)
}

export async function fetchOuraSleepPeriods(
  integration: Integration,
  startDate: Date,
  endDate: Date
) {
  return fetchOuraData(integration, 'sleep', startDate, endDate)
}

export async function fetchOuraDailyActivity(
  integration: Integration,
  startDate: Date,
  endDate: Date
) {
  return fetchOuraData(integration, 'daily_activity', startDate, endDate)
}

export async function fetchOuraDailyReadiness(
  integration: Integration,
  startDate: Date,
  endDate: Date
) {
  return fetchOuraData(integration, 'daily_readiness', startDate, endDate)
}

export async function fetchOuraWorkouts(integration: Integration, startDate: Date, endDate: Date) {
  return fetchOuraData(integration, 'workout', startDate, endDate)
}

export async function fetchOuraDailySpO2(integration: Integration, startDate: Date, endDate: Date) {
  return fetchOuraData(integration, 'daily_spo2', startDate, endDate)
}

export async function fetchOuraDailyStress(
  integration: Integration,
  startDate: Date,
  endDate: Date
) {
  return fetchOuraData(integration, 'daily_stress', startDate, endDate)
}

export async function fetchOuraVO2Max(integration: Integration, startDate: Date, endDate: Date) {
  return fetchOuraData(integration, 'vo2_max', startDate, endDate)
}

export async function fetchOuraPersonalInfo(tokenOrIntegration: string | Integration) {
  let accessToken: string
  if (typeof tokenOrIntegration === 'string') {
    accessToken = tokenOrIntegration
  } else {
    const validIntegration = await ensureValidToken(tokenOrIntegration)
    accessToken = validIntegration.accessToken
  }

  const response = await fetch('https://api.ouraring.com/v2/usercollection/personal_info', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    throw new Error(`Oura API error: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

// --- Normalization ---

export function normalizeOuraWellness(
  dailySleep: any,
  dailyActivity: any,
  dailyReadiness: any,
  sleepPeriods: any[],
  userId: string,
  date: Date,
  extraData: {
    spo2?: any
    stress?: any
    vo2max?: any
    personalInfo?: any
  } = {}
) {
  // Combine data into a single wellness record
  // date is expected to be the specific day (UTC midnight)

  // Check if we have any data
  if (
    !dailySleep &&
    !dailyActivity &&
    !dailyReadiness &&
    (!sleepPeriods || sleepPeriods.length === 0) &&
    !extraData.spo2 &&
    !extraData.stress
  )
    return null

  // Oura V2 'daily_sleep' has the daily score.
  // Biometrics (HRV/RHR) are in the 'sleep' periods.
  // We'll take the first major sleep period if multiple exist.
  const mainSleep = sleepPeriods?.find((p) => p.type === 'long_sleep') || sleepPeriods?.[0]

  const sleepSecs = dailySleep?.total_sleep_duration || mainSleep?.total_sleep_duration
  const sleepHours = sleepSecs ? Math.round((sleepSecs / 3600) * 10) / 10 : null
  const sleepScore = dailySleep?.score
  const sleepDeepSecs = mainSleep?.deep_sleep_duration ?? null
  const sleepRemSecs = mainSleep?.rem_sleep_duration ?? null
  const sleepLightSecs = mainSleep?.light_sleep_duration ?? null
  const sleepAwakeSecs = mainSleep?.awake_time ?? null

  // Readiness Metrics
  const readinessScore = dailyReadiness?.score

  // Biometrics from Sleep period (more precise raw values)
  // lowest_heart_rate and average_hrv are the standard raw metrics in Oura V2 sleep.
  // Note: We avoid using readiness contributors (resting_heart_rate, hrv_balance)
  // because they are 0-100 scores according to the OpenAPI schema.
  const restingHr = mainSleep?.lowest_heart_rate
  const avgHrv = mainSleep?.average_hrv

  // SpO2
  const spO2 = extraData.spo2?.spo2_percentage?.average || null

  // Stress
  // We map Oura daily summary to our stress field (if we use a 1-10 or category)
  // For now, let's keep it simple or store the raw summary
  let stressLevel = null
  if (extraData.stress?.day_summary === 'stressful') stressLevel = 8
  else if (extraData.stress?.day_summary === 'normal') stressLevel = 4
  else if (extraData.stress?.day_summary === 'restored') stressLevel = 1

  // VO2 Max
  const vo2max = extraData.vo2max?.vo2_max || null

  // Recovery Score (mapping 0-100 readiness to our 1-10)
  const recoveryScore = readinessScore ? Math.round(readinessScore) : null

  return {
    userId,
    date,
    hrv: avgHrv || null,
    hrvSdnn: null,
    restingHr: restingHr ? Math.round(restingHr) : null,
    avgSleepingHr: mainSleep?.average_heart_rate || null,
    sleepSecs: sleepSecs || null,
    sleepHours,
    sleepScore: sleepScore || null,
    sleepQuality: null,
    sleepDeepSecs,
    sleepRemSecs,
    sleepLightSecs,
    sleepAwakeSecs,
    readiness: readinessScore ? Math.round(readinessScore / 10) : null, // Normalize to 1-10
    recoveryScore: recoveryScore,
    soreness: null,
    fatigue: null,
    stress: stressLevel,
    mood: null,
    motivation: null,
    weight: extraData.personalInfo?.weight || null,
    spO2: spO2,
    respiration: mainSleep?.average_breath || null,
    skinTemp: dailyReadiness?.temperature_deviation || null,
    vo2max: vo2max,
    ctl: null,
    atl: null,
    comments: null,
    rawJson: {
      dailySleep,
      dailyActivity,
      dailyReadiness,
      sleepPeriods,
      ...extraData
    }
  }
}

export function normalizeOuraWorkout(workout: any, userId: string) {
  // workout object from /v2/usercollection/workout
  const startDate = new Date(workout.start_datetime)
  const endDate = new Date(workout.end_datetime)
  const durationSec = Math.round((endDate.getTime() - startDate.getTime()) / 1000)

  // Map activity type
  const type = workout.activity || 'other'

  return {
    userId,
    externalId: workout.id,
    source: 'oura',
    date: startDate,
    title: `Oura ${type.charAt(0).toUpperCase() + type.slice(1)}`,
    description: `Imported from Oura`,
    type: mapOuraActivityType(type),
    durationSec,
    distanceMeters: workout.distance || null,
    elevationGain: null,
    averageHr: null, // PublicWorkout V2 doesn't have average heart rate
    maxHr: null,
    kilojoules: workout.calories ? Math.round(workout.calories * 4.184) : null,
    rawJson: workout
  }
}

function mapOuraActivityType(ouraType: string): string {
  const map: Record<string, string> = {
    running: 'Run',
    cycling: 'Ride',
    walking: 'Walk',
    swimming: 'Swim',
    weight_training: 'WeightTraining',
    strength_training: 'WeightTraining',
    yoga: 'Yoga'
    // Add more as needed
  }
  return map[ouraType.toLowerCase()] || 'Other'
}
