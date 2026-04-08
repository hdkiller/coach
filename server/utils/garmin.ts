import type { Integration } from '@prisma/client'
import { prisma } from './db'

interface GarminTokenResponse {
  access_token: string
  expires_in: number
  refresh_token: string
  token_type: string
  scope?: string
}

interface GarminApiErrorPayload {
  errorMessage?: string
  error?: string | { message?: string }
  message?: string
}

const GARMIN_WRITE_SCOPE = 'PARTNER_WRITE'
const GARMIN_IMPORT_PERMISSIONS = new Set(['WORKOUT_IMPORT', 'COURSE_IMPORT'])

export function parseGarminScope(scope: string | null | undefined): Set<string> {
  if (!scope) return new Set()
  return new Set(
    scope
      .split(/[,\s]+/)
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean)
  )
}

export function mergeGarminScopes(
  ...sources: Array<string | string[] | Set<string> | null | undefined>
): Set<string> {
  const merged = new Set<string>()

  for (const source of sources) {
    if (!source) continue

    if (typeof source === 'string') {
      for (const value of parseGarminScope(source)) merged.add(value)
      continue
    }

    for (const value of source) {
      if (typeof value !== 'string') continue
      const normalized = value.trim().toUpperCase()
      if (normalized) merged.add(normalized)
    }
  }

  return merged
}

export function hasGarminPermission(
  scope: string | Set<string> | null | undefined,
  permission: string
): boolean {
  const scopes = typeof scope === 'string' || !scope ? parseGarminScope(scope) : scope
  const normalizedPermission = permission.trim().toUpperCase()

  if (scopes.has(normalizedPermission)) return true

  if (GARMIN_IMPORT_PERMISSIONS.has(normalizedPermission) && scopes.has(GARMIN_WRITE_SCOPE)) {
    return true
  }

  return false
}

/**
 * Refreshes an expired Garmin access token
 */
export async function refreshGarminToken(integration: Integration): Promise<Integration> {
  if (!integration.refreshToken) {
    throw new Error('No refresh token available for Garmin integration')
  }

  const clientId = process.env.GARMIN_CLIENT_ID
  const clientSecret = process.env.GARMIN_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Garmin credentials not configured')
  }

  const response = await fetch('https://diauth.garmin.com/di-oauth2-service/oauth/token', {
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
    throw new Error(`Failed to refresh Garmin token: ${response.statusText}`)
  }

  const tokenData: GarminTokenResponse = await response.json()

  return await prisma.integration.update({
    where: { id: integration.id },
    data: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
    }
  })
}

/**
 * Ensures a valid token, refreshing if necessary
 */
async function ensureValidToken(integration: Integration): Promise<Integration> {
  // Re-fetch to get the latest token from DB in case another parallel request refreshed it
  const latest = await prisma.integration.findUnique({
    where: { id: integration.id }
  })
  if (!latest) return integration

  if (!latest.expiresAt || new Date() >= new Date(latest.expiresAt.getTime() - 300000)) {
    return await refreshGarminToken(latest)
  }
  return latest
}

function extractGarminErrorMessage(
  response: Response,
  errorBody: GarminApiErrorPayload | Record<string, unknown>
): string {
  if (typeof errorBody?.errorMessage === 'string' && errorBody.errorMessage.trim()) {
    return errorBody.errorMessage.trim()
  }
  if (typeof errorBody?.message === 'string' && errorBody.message.trim()) {
    return errorBody.message.trim()
  }
  if (typeof errorBody?.error === 'string' && errorBody.error.trim()) {
    return errorBody.error.trim()
  }

  // Handle nested object error: { error: { message: "..." } }
  const nestedError = errorBody?.error
  if (
    nestedError &&
    typeof nestedError === 'object' &&
    'message' in nestedError &&
    typeof nestedError.message === 'string' &&
    nestedError.message.trim()
  ) {
    return nestedError.message.trim()
  }

  return response.statusText || 'Unknown error'
}

function shouldRetryGarminAuth(
  response: Response,
  errorBody: GarminApiErrorPayload | Record<string, unknown>,
  hasRetried: boolean
) {
  if (hasRetried || response.status !== 401) return false

  const message = extractGarminErrorMessage(response, errorBody).toLowerCase()
  return message.includes('token is not active') || message.includes('authentication credentials')
}

/**
 * Generic fetch with retry logic
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  backoff = 2000
): Promise<Response> {
  try {
    const response = await fetch(url, options)

    // Handle rate limiting (429)
    if (response.status === 429 && retries > 0) {
      const retryAfter = response.headers.get('Retry-After')
      const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : backoff

      console.warn(
        `[Garmin API] 429 Too Many Requests. Retrying in ${waitTime}ms... (${retries} retries left)`
      )
      await new Promise((resolve) => setTimeout(resolve, waitTime))

      return fetchWithRetry(url, options, retries - 1, backoff * 2)
    }

    return response
  } catch (error) {
    if (retries > 0) {
      console.warn(
        `[Garmin API] Network error: ${error}. Retrying in ${backoff}ms... (${retries} retries left)`
      )
      await new Promise((resolve) => setTimeout(resolve, backoff))
      return fetchWithRetry(url, options, retries - 1, backoff * 2)
    }
    throw error
  }
}

/**
 * Generic fetch for Garmin API
 */
export async function fetchGarminData(
  integration: Integration,
  url: string,
  params: Record<string, string> = {}
) {
  const targetUrl = new URL(url)
  Object.entries(params).forEach(([key, value]) => targetUrl.searchParams.append(key, value))

  let activeIntegration = await ensureValidToken(integration)

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetchWithRetry(targetUrl.toString(), {
        headers: {
          Authorization: `Bearer ${activeIntegration.accessToken}`
        }
      })

      if (response.ok) {
        return await response.json()
      }

      const errorBody = await response.json().catch(() => ({}))
      const errorMessage = extractGarminErrorMessage(response, errorBody)

      if (shouldRetryGarminAuth(response, errorBody, attempt > 0)) {
        activeIntegration = await refreshGarminToken(activeIntegration)
        continue
      }

      console.error(`[DEBUG] Garmin API Request Failed:`, {
        url: targetUrl.toString(),
        status: response.status,
        statusText: response.statusText,
        errorBody,
        headers: Object.fromEntries(response.headers.entries())
      })

      throw new Error(`Garmin API error (${response.status}): ${errorMessage}`)
    }

    throw new Error('Garmin API request failed after token refresh retry')
  } catch (error: any) {
    console.error(`[DEBUG] Garmin fetch exception:`, {
      url: targetUrl.toString(),
      message: error.message,
      stack: error.stack
    })
    throw error
  }
}

/**
 * Fetch wellness summaries (Dailies)
 */
export async function fetchGarminDailies(
  integration: Integration,
  startTimestamp: number,
  endTimestamp: number,
  token?: string
) {
  const params: Record<string, string> = {
    uploadStartTimeInSeconds: startTimestamp.toString(),
    uploadEndTimeInSeconds: endTimestamp.toString()
  }
  if (token) params.token = token

  return fetchGarminData(integration, 'https://apis.garmin.com/wellness-api/rest/dailies', params)
}

/**
 * Fetch Sleep summaries
 */
export async function fetchGarminSleeps(
  integration: Integration,
  startTimestamp: number,
  endTimestamp: number,
  token?: string
) {
  const params: Record<string, string> = {
    uploadStartTimeInSeconds: startTimestamp.toString(),
    uploadEndTimeInSeconds: endTimestamp.toString()
  }
  if (token) params.token = token

  return fetchGarminData(integration, 'https://apis.garmin.com/wellness-api/rest/sleeps', params)
}

/**
 * Fetch HRV summaries
 */
export async function fetchGarminHRV(
  integration: Integration,
  startTimestamp: number,
  endTimestamp: number,
  token?: string
) {
  const params: Record<string, string> = {
    uploadStartTimeInSeconds: startTimestamp.toString(),
    uploadEndTimeInSeconds: endTimestamp.toString()
  }
  if (token) params.token = token

  return fetchGarminData(integration, 'https://apis.garmin.com/wellness-api/rest/hrv', params)
}

/**
 * Fetch discrete Activity summaries
 */
export async function fetchGarminActivities(
  integration: Integration,
  startTimestamp: number,
  endTimestamp: number,
  token?: string
) {
  const params: Record<string, string> = {
    uploadStartTimeInSeconds: startTimestamp.toString(),
    uploadEndTimeInSeconds: endTimestamp.toString()
  }
  if (token) params.token = token

  return fetchGarminData(
    integration,
    'https://apis.garmin.com/wellness-api/rest/activities',
    params
  )
}

/**
 * Fetch raw activity file (FIT)
 */
export async function fetchGarminActivityFile(
  integration: Integration,
  fileId: string,
  pullToken?: string | null
): Promise<Buffer> {
  const url = new URL('https://apis.garmin.com/wellness-api/rest/activityFile')
  url.searchParams.set('id', fileId)
  if (pullToken) url.searchParams.set('token', pullToken)

  let activeIntegration = await ensureValidToken(integration)

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetchWithRetry(url.toString(), {
      headers: {
        Authorization: `Bearer ${activeIntegration.accessToken}`
      }
    })

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    }

    const errorBody = await response.json().catch(() => ({}))
    const errorMessage = extractGarminErrorMessage(response, errorBody)

    if (shouldRetryGarminAuth(response, errorBody, attempt > 0)) {
      activeIntegration = await refreshGarminToken(activeIntegration)
      continue
    }

    throw new Error(`Garmin File API error (${response.status}): ${errorMessage}`)
  }

  throw new Error('Garmin File API request failed after token refresh retry')
}

export async function fetchGarminActivityFileByCallbackUrl(
  integration: Integration,
  callbackUrl: string
): Promise<Buffer> {
  let activeIntegration = await ensureValidToken(integration)

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetchWithRetry(callbackUrl, {
      headers: {
        Authorization: `Bearer ${activeIntegration.accessToken}`
      }
    })

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    }

    const errorBody = await response.json().catch(() => ({}))
    const errorMessage = extractGarminErrorMessage(response, errorBody)

    if (shouldRetryGarminAuth(response, errorBody, attempt > 0)) {
      activeIntegration = await refreshGarminToken(activeIntegration)
      continue
    }

    throw new Error(`Garmin File API error (${response.status}): ${errorMessage}`)
  }

  throw new Error('Garmin File API request failed after token refresh retry')
}

/**
 * Request historical data backfill from Garmin
 */
export async function requestGarminBackfill(
  integration: Integration,
  type: 'activities' | 'dailies' | 'sleeps' | 'hrv',
  startTimestamp: number,
  endTimestamp: number
) {
  const url = `https://apis.garmin.com/wellness-api/rest/backfill/${type}`
  const targetUrl = new URL(url)
  targetUrl.searchParams.append('summaryStartTimeInSeconds', startTimestamp.toString())
  targetUrl.searchParams.append('summaryEndTimeInSeconds', endTimestamp.toString())

  let activeIntegration = await ensureValidToken(integration)

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetchWithRetry(targetUrl.toString(), {
      headers: {
        Authorization: `Bearer ${activeIntegration.accessToken}`
      }
    })

    if (response.ok) return { success: true }
    if (response.status === 409) return { success: true, message: 'Already requested' }

    const errorBody = await response.json().catch(() => ({}))
    const errorMessage = extractGarminErrorMessage(response, errorBody)

    if (shouldRetryGarminAuth(response, errorBody, attempt > 0)) {
      activeIntegration = await refreshGarminToken(activeIntegration)
      continue
    }

    throw new Error(`Garmin Backfill API error (${response.status}): ${errorMessage}`)
  }

  throw new Error('Garmin Backfill API request failed after token refresh retry')
}

/**
 * De-register a Garmin user token from partner access.
 */
export async function deRegisterGarminUser(integration: Integration) {
  const validIntegration = await ensureValidToken(integration)
  const url = 'https://apis.garmin.com/wellness-api/rest/user/registration'

  const response = await fetchWithRetry(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${validIntegration.accessToken}`
    }
  })

  // 204 is success. 401/404 can happen when already revoked/de-registered.
  if (response.ok || response.status === 401 || response.status === 404) {
    return { success: true, status: response.status }
  }

  const errorBody = await response.json().catch(() => ({}))
  const errorMessage = errorBody.errorMessage || response.statusText || 'Unknown error'
  throw new Error(`Garmin de-registration API error (${response.status}): ${errorMessage}`)
}

/**
 * Fetch current user permissions granted to this app.
 */
export async function fetchGarminUserPermissions(integration: Integration): Promise<string[]> {
  const url = 'https://apis.garmin.com/wellness-api/rest/user/permissions'

  let activeIntegration = await ensureValidToken(integration)

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetchWithRetry(url, {
      headers: {
        Authorization: `Bearer ${activeIntegration.accessToken}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data)) {
        return data.filter((x) => typeof x === 'string')
      }
      if (Array.isArray(data?.permissions)) {
        return data.permissions.filter((x: unknown) => typeof x === 'string')
      }
      return []
    }

    const errorBody = await response.json().catch(() => ({}))
    const errorMessage = extractGarminErrorMessage(response, errorBody)

    if (shouldRetryGarminAuth(response, errorBody, attempt > 0)) {
      activeIntegration = await refreshGarminToken(activeIntegration)
      continue
    }

    throw new Error(`Garmin permissions API error (${response.status}): ${errorMessage}`)
  }

  throw new Error('Garmin permissions API request failed after token refresh retry')
}
