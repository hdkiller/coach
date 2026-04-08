import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requireAuth } from '../../../../../server/utils/auth-guard'
import { getEffectiveUserId } from '../../../../../server/utils/coaching'
import { getUserLocalDate, getUserTimezone } from '../../../../../server/utils/date'

const { workoutRepositoryMock, prismaMock } = vi.hoisted(() => ({
  workoutRepositoryMock: {
    getForUser: vi.fn()
  },
  prismaMock: {
    plannedWorkout: {
      findMany: vi.fn()
    }
  }
}))

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('defineRouteMeta', () => {})
vi.stubGlobal('getQuery', (event: any) => event.query || {})
vi.stubGlobal('getHeader', (event: any, name: string) => event.headers?.[name])
vi.stubGlobal('getCookie', (event: any, name: string) => event.cookies?.[name])
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message)
  ;(error as any).statusCode = err.statusCode
  return error
})

vi.mock('../../../../../server/utils/auth-guard', () => ({
  requireAuth: vi.fn()
}))

vi.mock('../../../../../server/utils/coaching', () => ({
  getEffectiveUserId: vi.fn()
}))

vi.mock('../../../../../server/utils/date', async () => {
  const actual = await vi.importActual<typeof import('../../../../../server/utils/date')>(
    '../../../../../server/utils/date'
  )

  return {
    ...actual,
    getUserTimezone: vi.fn(),
    getUserLocalDate: vi.fn()
  }
})

vi.mock('../../../../../server/utils/repositories/workoutRepository', () => ({
  workoutRepository: workoutRepositoryMock
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: prismaMock
}))

const getHandler = async () => {
  const mod = await import('../../../../../server/api/stats/monthly-comparison.get')
  return mod.default
}

describe('GET /api/stats/monthly-comparison', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getEffectiveUserId).mockResolvedValue('user-1')
    vi.mocked(getUserTimezone).mockResolvedValue('America/New_York')
    vi.mocked(getUserLocalDate).mockReturnValue(new Date('2026-04-08T00:00:00Z'))
    vi.mocked(workoutRepositoryMock.getForUser).mockResolvedValue([] as any)
    vi.mocked(prismaMock.plannedWorkout.findMany).mockResolvedValue([] as any)
  })

  it('uses adjacent local months for labels and completed workout query bounds', async () => {
    const handler = await getHandler()

    const result = await handler({ query: { sport: 'all' } } as any)

    expect(result.currentMonth.name).toBe('April')
    expect(result.lastMonth.name).toBe('March')

    expect(workoutRepositoryMock.getForUser).toHaveBeenNthCalledWith(
      1,
      'user-1',
      expect.objectContaining({
        startDate: new Date('2026-04-01T04:00:00.000Z'),
        endDate: new Date('2026-05-01T03:59:59.999Z')
      })
    )

    expect(workoutRepositoryMock.getForUser).toHaveBeenNthCalledWith(
      2,
      'user-1',
      expect.objectContaining({
        startDate: new Date('2026-03-01T05:00:00.000Z'),
        endDate: new Date('2026-04-01T03:59:59.999Z')
      })
    )

    expect(prismaMock.plannedWorkout.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: {
            gte: new Date('2026-04-01T00:00:00.000Z'),
            lte: new Date('2026-04-30T00:00:00.000Z')
          }
        })
      })
    )
  })
})
