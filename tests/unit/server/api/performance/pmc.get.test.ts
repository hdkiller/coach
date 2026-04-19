import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getCurrentFitnessSummary,
  getFormStatus
} from '../../../../../server/utils/training-stress'
import {
  getUserTimezone,
  getUserLocalDate,
  getStartOfYearUTC
} from '../../../../../server/utils/date'

import { requireAuth } from '../../../../../server/utils/auth-guard'
import { prisma } from '../../../../../server/utils/db'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('defineRouteMeta', () => {})
vi.stubGlobal('getQuery', (event: any) => event.query || {})
vi.stubGlobal('getHeader', (event: any, name: string) => event.headers?.[name])
vi.stubGlobal('getCookie', (event: any, name: string) => event.cookies?.[name])
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message)
  // @ts-expect-error test-only statusCode assignment
  error.statusCode = err.statusCode
  return error
})

vi.mock('../../../../../server/utils/auth-guard', () => ({
  requireAuth: vi.fn()
}))

vi.mock('../../../../../server/utils/date', () => ({
  getUserTimezone: vi.fn(),
  getUserLocalDate: vi.fn(),
  getStartOfYearUTC: vi.fn()
}))

vi.mock('../../../../../server/utils/training-stress', () => ({
  calculatePMCForDateRange: vi.fn(),
  getInitialPMCValues: vi.fn(),
  getCurrentFitnessSummary: vi.fn(),
  getFormStatus: vi.fn()
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    }
  }
}))

const getHandler = async () => {
  const mod = await import('../../../../../server/api/performance/pmc.get')
  return mod.default
}

describe('GET /api/performance/pmc', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getUserTimezone).mockResolvedValue('Europe/Budapest')
    vi.mocked(getUserLocalDate).mockReturnValue(new Date('2026-03-09T00:00:00Z'))
    vi.mocked(getStartOfYearUTC).mockReturnValue(new Date('2026-01-01T00:00:00Z'))
    vi.mocked(getFormStatus).mockReturnValue({
      status: 'Productive',
      color: 'blue',
      description: 'Optimal training zone; building fitness'
    })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      dashboardSettings: { trainingLoad: { displayMode: 'adjusted' } }
    } as any)
  })

  it('uses pre-workout current fitness for the summary', async () => {
    const handler = await getHandler()
    const { calculatePMCForDateRange, getInitialPMCValues } =
      await import('../../../../../server/utils/training-stress')

    vi.mocked(getCurrentFitnessSummary).mockResolvedValue({
      ctl: 58.9,
      atl: 72.9,
      tsb: -14,
      formStatus: getFormStatus(-14),
      lastUpdated: new Date('2026-03-08T01:00:00Z')
    } as any)
    vi.mocked(getInitialPMCValues).mockResolvedValue({ ctl: 40, atl: 45 } as any)
    vi.mocked(calculatePMCForDateRange).mockResolvedValue([
      {
        date: new Date('2026-03-08T00:00:00Z'),
        ctl: 58.9,
        atl: 72.9,
        tsb: -14,
        tss: 90
      }
    ] as any)

    const result = await handler({ query: { days: '7' } } as any)

    expect(getCurrentFitnessSummary).toHaveBeenCalledWith('user-1', undefined, {
      adjustForTodayUncompletedPlannedTSS: true,
      timezone: 'Europe/Budapest'
    })
    expect(result.summary.currentCTL).toBe(58.9)
    expect(result.summary.currentATL).toBe(72.9)
    expect(result.summary.currentTSB).toBe(-14)
  })
})
