import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Integration } from '@prisma/client'

import {
  clearOuraUnauthorizedEndpointCache,
  fetchOuraDailySpO2,
  hasOuraScope,
  parseOuraScope
} from '../../../../../server/utils/oura'
import { OuraService } from '../../../../../server/utils/services/ouraService'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    integration: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    user: {
      findUnique: vi.fn()
    }
  }
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: prismaMock
}))

vi.mock('../../../../../server/utils/repositories/wellnessRepository', () => ({
  wellnessRepository: {
    upsert: vi.fn().mockResolvedValue({
      record: { id: 'w1', date: new Date(), weight: null, bodyFat: null, rawJson: {} }
    })
  }
}))

vi.mock('../../../../../server/utils/repositories/workoutRepository', () => ({
  workoutRepository: {
    upsert: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/services/bodyMeasurementService', () => ({
  bodyMeasurementService: {
    recordWellnessMetrics: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/normalize-tss', () => ({
  normalizeTSS: vi.fn()
}))

vi.mock('../../../../../server/utils/calculate-workout-stress', () => ({
  calculateWorkoutStress: vi.fn()
}))

vi.mock('../../../../../server/utils/services/wellness-analysis', () => ({
  triggerReadinessCheckIfNeeded: vi.fn()
}))

function makeIntegration(overrides: Partial<Integration> = {}): Integration {
  return {
    id: 'int-oura-1',
    userId: 'user-1',
    provider: 'oura',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    externalUserId: 'oura-user',
    scope: null,
    lastSyncAt: null,
    syncStatus: 'SUCCESS',
    errorMessage: null,
    initialSyncCompleted: true,
    ingestWorkouts: false,
    settings: { ingestWellness: true },
    ...overrides
  } as Integration
}

describe('Oura scope helpers', () => {
  it('parses space-delimited Oura scopes', () => {
    expect(parseOuraScope('email personal daily spo2Daily')).toEqual(
      new Set(['email', 'personal', 'daily', 'spo2Daily'])
    )
  })

  it('detects spo2Daily when present on the integration', () => {
    expect(hasOuraScope(makeIntegration({ scope: 'daily spo2Daily' }), 'spo2Daily')).toBe(true)
    expect(hasOuraScope(makeIntegration({ scope: 'daily workout' }), 'spo2Daily')).toBe(false)
    expect(hasOuraScope(makeIntegration({ scope: null }), 'spo2Daily')).toBe(false)
  })
})

describe('fetchOuraDailySpO2', () => {
  const fetchMock = vi.fn()
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

  beforeEach(() => {
    clearOuraUnauthorizedEndpointCache()
    fetchMock.mockReset()
    warnSpy.mockClear()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('skips the API call when stored scope lacks spo2Daily', async () => {
    const result = await fetchOuraDailySpO2(
      makeIntegration({ scope: 'email personal daily' }),
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-01T00:00:00.000Z')
    )

    expect(result).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('handles 401 for daily_spo2 silently and does not warn again on retry', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'unauthorized'
    })

    const integration = makeIntegration({ scope: null })
    const start = new Date('2026-07-01T00:00:00.000Z')
    const end = new Date('2026-07-01T00:00:00.000Z')

    await expect(fetchOuraDailySpO2(integration, start, end)).resolves.toEqual([])
    await expect(fetchOuraDailySpO2(integration, start, end)).resolves.toEqual([])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('fetches SpO2 when spo2Daily scope is granted', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ day: '2026-07-01', spo2_percentage: { average: 97.5 } }]
      })
    })

    const result = await fetchOuraDailySpO2(
      makeIntegration({ scope: 'daily spo2Daily' }),
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-01T00:00:00.000Z')
    )

    expect(result).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('daily_spo2')
  })
})

describe('OuraService.syncDay SpO2 scope gating', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    clearOuraUnauthorizedEndpointCache()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    prismaMock.integration.findUnique.mockReset()
    prismaMock.user.findUnique.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not call daily_spo2 when integration scope omits spo2Daily', async () => {
    prismaMock.integration.findUnique.mockResolvedValue(
      makeIntegration({ scope: 'email personal daily heartrate workout' })
    )
    prismaMock.user.findUnique.mockResolvedValue({ weightUnits: 'kg' })

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    })

    await OuraService.syncDay('user-1', new Date('2026-07-01T12:00:00.000Z'))

    const calledUrls = fetchMock.mock.calls.map((call) => String(call[0]))
    expect(calledUrls.some((url) => url.includes('daily_spo2'))).toBe(false)
  })
})
