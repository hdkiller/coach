import type { Integration } from '@prisma/client'
import { prisma } from './db'

const FITBIT_API_BASE = 'https://api.fitbit.com'

interface FitbitTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
  user_id: string
}

interface FitbitFoodLogEntry {
  logDate?: string
  logId?: number
  loggedFood?: {
    accessLevel?: string
    amount?: number
    brand?: string
    calories?: number
    foodId?: number
    locale?: string
    mealTypeId?: number
    name?: string
    unit?: {
      id?: number
      name?: string
      plural?: string
    }
  }
  nutritionalValues?: {
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
    fiber?: number
    sugar?: number
    sodium?: number
    [key: string]: number | undefined
  }
  isFavorite?: boolean
}

export interface FitbitFoodLogResponse {
  foods: FitbitFoodLogEntry[]
  summary?: {
    calories?: number
    carbs?: number
    fat?: number
    fiber?: number
    protein?: number
    sugar?: number
    sodium?: number
    water?: number
    [key: string]: number | undefined
  }
  goals?: {
    calories?: number
  }
}

export interface FitbitWaterLogResponse {
  summary?: {
    water?: number
  }
  water?: {
    amount?: number
    logId?: number
  }[]
}

export interface FitbitFoodGoalsResponse {
  goals?: {
    calories?: number
  }
}

export interface FitbitWaterGoalsResponse {
  goal?: {
    goal?: number
    startDate?: string
  }
}

function encodeBasicAuth(clientId: string, clientSecret: string) {
  const creds = `${clientId}:${clientSecret}`
  return Buffer.from(creds).toString('base64')
}

/**
 * Refreshes an expired Fitbit access token using the refresh token
 */
export async function refreshFitbitToken(integration: Integration): Promise<Integration> {
  if (!integration.refreshToken) {
    throw new Error('No refresh token available for Fitbit integration')
  }

  const clientId = process.env.FITBIT_CLIENT_ID
  const clientSecret = process.env.FITBIT_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Fitbit credentials not configured')
  }

  const response = await fetch(`${FITBIT_API_BASE}/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${encodeBasicAuth(clientId, clientSecret)}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: integration.refreshToken
    }).toString()
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Fitbit token refresh failed:', errorText)
    throw new Error(`Failed to refresh Fitbit token: ${response.status} ${response.statusText}`)
  }

  const tokenData: FitbitTokenResponse = await response.json()
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

  const updatedIntegration = await prisma.integration.update({
    where: { id: integration.id },
    data: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt,
      scope: tokenData.scope,
      externalUserId: tokenData.user_id
    }
  })

  return updatedIntegration
}

function isTokenExpired(integration: Integration): boolean {
  if (!integration.expiresAt) return false
  const now = new Date()
  const expiryWithBuffer = new Date(integration.expiresAt.getTime() - 5 * 60 * 1000)
  return now >= expiryWithBuffer
}

async function ensureValidToken(integration: Integration): Promise<Integration> {
  if (isTokenExpired(integration)) {
    return await refreshFitbitToken(integration)
  }
  return integration
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  backoff = 1000
): Promise<Response> {
  try {
    const response = await fetch(url, options)

    const limitHeader =
      response.headers.get('fitbit-rate-limit-limit') || response.headers.get('rate-limit-limit')
    const remainingHeader =
      response.headers.get('fitbit-rate-limit-remaining') ||
      response.headers.get('rate-limit-remaining')
    const resetHeader =
      response.headers.get('fitbit-rate-limit-reset') || response.headers.get('rate-limit-reset')

    const remaining = remainingHeader ? parseInt(remainingHeader, 10) : null
    const resetSeconds = resetHeader ? parseInt(resetHeader, 10) : null

    if (remaining !== null && resetSeconds !== null) {
      console.log(
        `[Fitbit API] Rate limit: ${remainingHeader}/${limitHeader ?? 'unknown'} remaining, resets in ${resetSeconds}s`
      )
    }

    if (response.status === 429 && retries > 0) {
      const retryAfter = response.headers.get('Retry-After')
      const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : backoff

      console.warn(
        `[Fitbit API] 429 Too Many Requests. Retrying in ${waitTime}ms... (${retries} retries left)`
      )
      await new Promise((resolve) => setTimeout(resolve, waitTime))

      return fetchWithRetry(url, options, retries - 1, backoff * 2)
    }

    return response
  } catch (error) {
    if (retries > 0) {
      console.warn(
        `[Fitbit API] Network error: ${error}. Retrying in ${backoff}ms... (${retries} retries left)`
      )
      await new Promise((resolve) => setTimeout(resolve, backoff))
      return fetchWithRetry(url, options, retries - 1, backoff * 2)
    }
    throw error
  }
}

async function fitbitGet<T>(integration: Integration, path: string): Promise<T> {
  const validIntegration = await ensureValidToken(integration)
  const response = await fetchWithRetry(`${FITBIT_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${validIntegration.accessToken}`,
      Accept: 'application/json'
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Fitbit] API error:', errorText)

    if (response.status === 429) {
      const resetHeader =
        response.headers.get('fitbit-rate-limit-reset') ||
        response.headers.get('rate-limit-reset')
      const resetSeconds = resetHeader ? parseInt(resetHeader, 10) : null
      throw new Error(
        `FITBIT_RATE_LIMITED${resetSeconds !== null ? `_RESET_${resetSeconds}` : ''}`
      )
    }

    if (response.status === 401) {
      const refreshed = await refreshFitbitToken(validIntegration)
      const retry = await fetchWithRetry(`${FITBIT_API_BASE}${path}`, {
        headers: {
          Authorization: `Bearer ${refreshed.accessToken}`,
          Accept: 'application/json'
        }
      })

      if (!retry.ok) {
        const retryError = await retry.text()
        console.error('[Fitbit] API retry error:', retryError)
        throw new Error(`Fitbit API request failed: ${retry.status} ${retry.statusText}`)
      }

      return (await retry.json()) as T
    }

    throw new Error(`Fitbit API request failed: ${response.status} ${response.statusText}`)
  }

  return (await response.json()) as T
}

export async function fetchFitbitFoodLog(
  integration: Integration,
  date: string
): Promise<FitbitFoodLogResponse> {
  return await fitbitGet<FitbitFoodLogResponse>(integration, `/1/user/-/foods/log/date/${date}.json`)
}

export async function fetchFitbitWaterLog(
  integration: Integration,
  date: string
): Promise<FitbitWaterLogResponse> {
  return await fitbitGet<FitbitWaterLogResponse>(
    integration,
    `/1/user/-/foods/log/water/date/${date}.json`
  )
}

export async function fetchFitbitFoodGoals(
  integration: Integration
): Promise<FitbitFoodGoalsResponse> {
  return await fitbitGet<FitbitFoodGoalsResponse>(integration, '/1/user/-/foods/log/goal.json')
}

export async function fetchFitbitWaterGoals(
  integration: Integration
): Promise<FitbitWaterGoalsResponse> {
  return await fitbitGet<FitbitWaterGoalsResponse>(integration, '/1/user/-/foods/log/water/goal.json')
}

const MEAL_TYPE_MAP: Record<number, 'breakfast' | 'lunch' | 'dinner' | 'snacks'> = {
  1: 'breakfast',
  2: 'snacks',
  3: 'lunch',
  4: 'snacks',
  5: 'dinner',
  6: 'snacks',
  7: 'snacks'
}

export function normalizeFitbitNutrition(
  foodLog: FitbitFoodLogResponse,
  waterLog: FitbitWaterLogResponse | null,
  foodGoals: FitbitFoodGoalsResponse | null,
  userId: string,
  date: string
) {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number)
  const dateObj = new Date(Date.UTC(year, month - 1, day))

  const mealGroups: Record<'breakfast' | 'lunch' | 'dinner' | 'snacks', any[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: []
  }

  for (const entry of foodLog.foods || []) {
    const loggedFood = entry.loggedFood || {}
    const nutrients = entry.nutritionalValues || {}
    const mealTypeId = loggedFood.mealTypeId ?? 7
    const mealKey = MEAL_TYPE_MAP[mealTypeId] || 'snacks'
    const unitName = loggedFood.unit?.name || loggedFood.unit?.plural || null
    const itemName = loggedFood.name ?? 'Unknown'
    const itemBrand = loggedFood.brand ?? null

    const itemDate = entry.logDate || date

    mealGroups[mealKey].push({
      logId: entry.logId,
      mealTypeId,
      amount: loggedFood.amount ?? null,
      serving: unitName,
      unit: unitName,
      name: itemName,
      product_name: itemName,
      brand: itemBrand,
      product_brand: itemBrand,
      date: itemDate,
      source: 'fitbit',
      calories: nutrients.calories ?? loggedFood.calories ?? null,
      protein: nutrients.protein ?? null,
      carbs: nutrients.carbs ?? null,
      fat: nutrients.fat ?? null,
      fiber: nutrients.fiber ?? null,
      sugar: nutrients.sugar ?? null,
      raw: entry
    })
  }

  const summary = foodLog.summary || {}
  const waterMl = waterLog?.summary?.water ?? null

  return {
    userId,
    date: dateObj,
    calories: summary.calories ?? null,
    protein: summary.protein ?? null,
    carbs: summary.carbs ?? null,
    fat: summary.fat ?? null,
    fiber: summary.fiber ?? null,
    sugar: summary.sugar ?? null,
    waterMl: waterMl ?? null,
    caloriesGoal: foodGoals?.goals?.calories ?? foodLog.goals?.calories ?? null,
    proteinGoal: null,
    carbsGoal: null,
    fatGoal: null,
    breakfast: mealGroups.breakfast.length ? mealGroups.breakfast : null,
    lunch: mealGroups.lunch.length ? mealGroups.lunch : null,
    dinner: mealGroups.dinner.length ? mealGroups.dinner : null,
    snacks: mealGroups.snacks.length ? mealGroups.snacks : null,
    rawJson: {
      foodLog,
      waterLog,
      foodGoals
    }
  }
}
