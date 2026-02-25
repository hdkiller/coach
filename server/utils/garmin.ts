import type { Integration } from '@prisma/client'
import { prisma } from './db'

interface GarminTokenResponse {
  access_token: string
  expires_in: number
  refresh_token: string
  token_type: string
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

/**
 * Generic fetch for Garmin API
 */
export async function fetchGarminData(
  integration: Integration,
  url: string,
  params: Record<string, string> = {}
) {
  const validIntegration = await ensureValidToken(integration)

  const targetUrl = new URL(url)
  Object.entries(params).forEach(([key, value]) => targetUrl.searchParams.append(key, value))

  try {
    const response = await fetch(targetUrl.toString(), {
      headers: {
        Authorization: `Bearer ${validIntegration.accessToken}`
      }
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      const errorMessage =
        errorBody.errorMessage || errorBody.error?.message || response.statusText || 'Unknown error'

      console.error(`[DEBUG] Garmin API Request Failed:`, {
        url: targetUrl.toString(),
        status: response.status,
        statusText: response.statusText,
        errorBody,
        headers: Object.fromEntries(response.headers.entries())
      })

      throw new Error(`Garmin API error (${response.status}): ${errorMessage}`)
    }

    return await response.json()
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
  endTimestamp: number
) {
  return fetchGarminData(integration, 'https://apis.garmin.com/wellness-api/rest/dailies', {
    uploadStartTimeInSeconds: startTimestamp.toString(),
    uploadEndTimeInSeconds: endTimestamp.toString()
  })
}

/**
 * Fetch Sleep summaries
 */
export async function fetchGarminSleeps(
  integration: Integration,
  startTimestamp: number,
  endTimestamp: number
) {
  return fetchGarminData(integration, 'https://apis.garmin.com/wellness-api/rest/sleeps', {
    uploadStartTimeInSeconds: startTimestamp.toString(),
    uploadEndTimeInSeconds: endTimestamp.toString()
  })
}

/**
 * Fetch HRV summaries
 */
export async function fetchGarminHRV(
  integration: Integration,
  startTimestamp: number,
  endTimestamp: number
) {
  return fetchGarminData(integration, 'https://apis.garmin.com/wellness-api/rest/hrv', {
    uploadStartTimeInSeconds: startTimestamp.toString(),
    uploadEndTimeInSeconds: endTimestamp.toString()
  })
}

/**
 * Fetch discrete Activity summaries
 */
export async function fetchGarminActivities(
  integration: Integration,
  startTimestamp: number,
  endTimestamp: number
) {
  return fetchGarminData(integration, 'https://apis.garmin.com/wellness-api/rest/activities', {
    uploadStartTimeInSeconds: startTimestamp.toString(),
    uploadEndTimeInSeconds: endTimestamp.toString()
  })
}

/**
 * Fetch raw activity file (FIT)
 */
export async function fetchGarminActivityFile(
  integration: Integration,
  fileId: string
): Promise<Buffer> {
  const validIntegration = await ensureValidToken(integration)

  // Note: Activity Files use a different base URL sometimes, but wellness-api also has it.
  // The documentation says: GET https://apis.garmin.com/wellness-api/rest/activityFile?id=XXX
  const url = `https://apis.garmin.com/wellness-api/rest/activityFile?id=${fileId}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${validIntegration.accessToken}`
    }
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    const errorMessage = errorBody.errorMessage || response.statusText || 'Unknown error'
    throw new Error(`Garmin File API error (${response.status}): ${errorMessage}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
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
  const validIntegration = await ensureValidToken(integration)

  const url = `https://apis.garmin.com/wellness-api/rest/backfill/${type}`
  const targetUrl = new URL(url)
  targetUrl.searchParams.append('summaryStartTimeInSeconds', startTimestamp.toString())
  targetUrl.searchParams.append('summaryEndTimeInSeconds', endTimestamp.toString())

  const response = await fetch(targetUrl.toString(), {
    headers: {
      Authorization: `Bearer ${validIntegration.accessToken}`
    }
  })

  if (!response.ok) {
    if (response.status === 409) return { success: true, message: 'Already requested' }

    const errorBody = await response.json().catch(() => ({}))
    const errorMessage = errorBody.errorMessage || response.statusText || 'Unknown error'

    throw new Error(`Garmin Backfill API error (${response.status}): ${errorMessage}`)
  }

  return { success: true }
}
