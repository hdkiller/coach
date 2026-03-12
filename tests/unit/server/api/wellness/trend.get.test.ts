import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getServerSession } from '../../../../../server/utils/session'
import { prisma } from '../../../../../server/utils/db'
import { wellnessRepository } from '../../../../../server/utils/repositories/wellnessRepository'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('defineRouteMeta', () => {})
vi.stubGlobal('getQuery', (event: any) => event.query || {})
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message)
  ;(error as any).statusCode = err.statusCode
  return error
})

vi.mock('../../../../../server/utils/session', () => ({
  getServerSession: vi.fn()
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    dailyMetric: {
      findMany: vi.fn()
    }
  }
}))

vi.mock('../../../../../server/utils/repositories/wellnessRepository', () => ({
  wellnessRepository: {
    getForUser: vi.fn()
  }
}))

const getHandler = async () => {
  const mod = await import('../../../../../server/api/wellness/trend.get')
  return mod.default
}

describe('GET /api/wellness/trend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as any)
    vi.mocked(prisma.dailyMetric.findMany).mockResolvedValue([] as any)
  })

  it('converts sleepSecs to hours when wellness sleepHours is null', async () => {
    const handler = await getHandler()

    vi.mocked(wellnessRepository.getForUser).mockResolvedValue([
      {
        date: new Date('2026-03-11T00:00:00Z'),
        hrv: null,
        restingHr: null,
        sleepHours: null,
        sleepSecs: 27000,
        sleepScore: 82,
        sleepQuality: null,
        recoveryScore: null,
        readiness: null
      }
    ] as any)

    const result = await handler({
      query: {
        startDate: '2026-03-05',
        endDate: '2026-03-11'
      }
    } as any)

    expect(wellnessRepository.getForUser).toHaveBeenCalledWith('user-1', {
      startDate: new Date('2026-03-05'),
      endDate: new Date('2026-03-11'),
      orderBy: { date: 'asc' }
    })
    expect(result).toEqual([
      expect.objectContaining({
        date: '2026-03-11',
        hoursSlept: 7.5,
        sleepScore: 82
      })
    ])
  })
})
