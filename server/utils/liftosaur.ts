const LIFTOSAUR_API_BASE = 'https://www.liftosaur.com/api/v1'
const LIFTOSAUR_REQUEST_TIMEOUT_MS = 20_000
const LIFTOSAUR_MAX_ATTEMPTS = 3

export type LiftosaurProgramSummary = {
  id: string
  name: string
  isCurrent: boolean
}

export type LiftosaurHistoryRecord = {
  id: number | string
  text: string
}

export type LiftosaurMeasurementValue = {
  timestamp: number
  date: string
  value: string
}

type LiftosaurProgramsResponse = {
  data: {
    programs: LiftosaurProgramSummary[]
  }
}

type LiftosaurHistoryResponse = {
  data: {
    records: LiftosaurHistoryRecord[]
    hasMore: boolean
    nextCursor?: number | string
  }
}

type LiftosaurMeasurementResponse = {
  data: {
    key: string
    category: string
    values: LiftosaurMeasurementValue[]
    hasMore: boolean
    nextCursor?: number | string
  }
}

type LiftosaurErrorBody = {
  error?: {
    code?: string
    message?: string
    details?: unknown
  }
}

export class LiftosaurApiError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly retryable: boolean
  readonly details?: unknown

  constructor(params: { statusCode: number; code?: string; message: string; details?: unknown }) {
    super(params.message)
    this.name = 'LiftosaurApiError'
    this.statusCode = params.statusCode
    this.code = params.code || 'liftosaur_api_error'
    this.retryable = params.statusCode === 429 || params.statusCode >= 500
    this.details = params.details
  }
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
}

function retryDelay(response: Response | null, attempt: number) {
  const retryAfter = response?.headers.get('retry-after')
  if (retryAfter) {
    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds)) return Math.min(Math.max(seconds * 1000, 0), 10_000)

    const retryAt = new Date(retryAfter).getTime()
    if (Number.isFinite(retryAt)) return Math.min(Math.max(retryAt - Date.now(), 0), 10_000)
  }

  return Math.min(500 * 2 ** (attempt - 1), 4_000)
}

async function parseErrorResponse(response: Response) {
  let body: LiftosaurErrorBody | null = null
  try {
    body = (await response.json()) as LiftosaurErrorBody
  } catch {
    // Liftosaur normally returns JSON errors, but do not expose an HTML/plain-text response.
  }

  const fallbackMessage =
    response.status === 401
      ? 'The Liftosaur API key is invalid or has been revoked.'
      : response.status === 403
        ? 'An active Liftosaur Premium subscription is required.'
        : response.status === 429
          ? 'Liftosaur is temporarily rate limiting requests.'
          : `Liftosaur request failed with status ${response.status}.`

  return new LiftosaurApiError({
    statusCode: response.status,
    code: body?.error?.code,
    message: body?.error?.message || fallbackMessage,
    details: body?.error?.details
  })
}

export async function liftosaurRequest<T>(
  apiKey: string,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (!apiKey) {
    throw new LiftosaurApiError({
      statusCode: 401,
      code: 'missing_api_key',
      message: 'A Liftosaur API key is required.'
    })
  }

  let lastError: unknown

  for (let attempt = 1; attempt <= LIFTOSAUR_MAX_ATTEMPTS; attempt++) {
    let response: Response | null = null
    try {
      response = await fetch(`${LIFTOSAUR_API_BASE}${path}`, {
        ...options,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
          ...options.headers
        },
        signal: options.signal || AbortSignal.timeout(LIFTOSAUR_REQUEST_TIMEOUT_MS)
      })

      if (response.ok) return (await response.json()) as T

      const error = await parseErrorResponse(response)
      if (!error.retryable || attempt === LIFTOSAUR_MAX_ATTEMPTS) throw error
      lastError = error
    } catch (error) {
      if (error instanceof LiftosaurApiError && !error.retryable) throw error
      lastError = error
      if (attempt === LIFTOSAUR_MAX_ATTEMPTS) break
    }

    await wait(retryDelay(response, attempt))
  }

  if (lastError instanceof LiftosaurApiError) throw lastError
  throw new LiftosaurApiError({
    statusCode: 503,
    code: 'provider_unavailable',
    message: 'Liftosaur is temporarily unavailable. Please try again later.'
  })
}

export async function fetchLiftosaurPrograms(apiKey: string) {
  const response = await liftosaurRequest<LiftosaurProgramsResponse>(apiKey, '/programs')
  return response.data.programs
}

export async function fetchLiftosaurHistoryPage(
  apiKey: string,
  options: {
    startDate?: string
    endDate?: string
    cursor?: number | string
    limit?: number
  } = {}
) {
  const query = new URLSearchParams()
  if (options.startDate) query.set('startDate', options.startDate)
  if (options.endDate) query.set('endDate', options.endDate)
  if (options.cursor !== undefined) query.set('cursor', String(options.cursor))
  query.set('limit', String(Math.min(Math.max(options.limit || 200, 1), 200)))

  return liftosaurRequest<LiftosaurHistoryResponse>(apiKey, `/history?${query.toString()}`)
}

export async function fetchAllLiftosaurHistory(
  apiKey: string,
  options: { startDate?: string; endDate?: string } = {}
) {
  const records: LiftosaurHistoryRecord[] = []
  let cursor: number | string | undefined
  const seenCursors = new Set<string>()

  do {
    const response = await fetchLiftosaurHistoryPage(apiKey, { ...options, cursor, limit: 200 })
    records.push(...(response.data.records || []))
    cursor = response.data.hasMore ? response.data.nextCursor : undefined
    if (cursor !== undefined) {
      const cursorKey = String(cursor)
      if (seenCursors.has(cursorKey)) {
        throw new LiftosaurApiError({
          statusCode: 502,
          code: 'invalid_pagination',
          message: 'Liftosaur returned a repeated history pagination cursor.'
        })
      }
      seenCursors.add(cursorKey)
    }
  } while (cursor !== undefined)

  return records
}

export async function fetchLiftosaurMeasurementPage(
  apiKey: string,
  key: 'weight' | 'bodyfat',
  options: { cursor?: number | string; limit?: number } = {}
) {
  const query = new URLSearchParams()
  if (options.cursor !== undefined) query.set('cursor', String(options.cursor))
  query.set('limit', String(Math.min(Math.max(options.limit || 200, 1), 200)))

  return liftosaurRequest<LiftosaurMeasurementResponse>(
    apiKey,
    `/measurements/${key}?${query.toString()}`
  )
}

export async function fetchAllLiftosaurMeasurements(apiKey: string, key: 'weight' | 'bodyfat') {
  const values: LiftosaurMeasurementValue[] = []
  let cursor: number | string | undefined
  const seenCursors = new Set<string>()

  do {
    const response = await fetchLiftosaurMeasurementPage(apiKey, key, { cursor, limit: 200 })
    values.push(...(response.data.values || []))
    cursor = response.data.hasMore ? response.data.nextCursor : undefined
    if (cursor !== undefined) {
      const cursorKey = String(cursor)
      if (seenCursors.has(cursorKey)) {
        throw new LiftosaurApiError({
          statusCode: 502,
          code: 'invalid_pagination',
          message: 'Liftosaur returned a repeated measurement pagination cursor.'
        })
      }
      seenCursors.add(cursorKey)
    }
  } while (cursor !== undefined)

  return values
}

export function parseLiftosaurMeasurementValue(value: string) {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*(kg|lb|%)$/i)
  if (!match) return null

  const amount = Number(match[1])
  const unit = match[2]!.toLowerCase()
  if (!Number.isFinite(amount)) return null

  if (unit === 'lb') return { value: amount * 0.45359237, unit: 'kg' as const }
  if (unit === 'kg') return { value: amount, unit: 'kg' as const }
  return { value: amount, unit: 'pct' as const }
}
