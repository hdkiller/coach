import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requireAuth } from '../../../../../server/utils/auth-guard'
import { getUserTimezone } from '../../../../../server/utils/date'

const workoutRepositoryMock = {
  getForUser: vi.fn()
}

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('defineRouteMeta', () => {})
vi.stubGlobal('getQuery', (event: any) => event.query || {})
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message)
  ;(error as any).statusCode = err.statusCode
  return error
})
vi.stubGlobal('workoutRepository', workoutRepositoryMock)

vi.mock('../../../../../server/utils/auth-guard', () => ({
  requireAuth: vi.fn()
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {}
}))

vi.mock('../../../../../server/utils/date', async () => {
  const actual = await vi.importActual<typeof import('../../../../../server/utils/date')>(
    '../../../../../server/utils/date'
  )

  return {
    ...actual,
    getUserTimezone: vi.fn()
  }
})

const getHandler = async () =>
  (await import('../../../../../server/api/workouts/by-date.get')).default

describe('GET /api/workouts/by-date', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ id: 'user-1' } as any)
    workoutRepositoryMock.getForUser.mockResolvedValue([])
  })

  it('queries the requested Los Angeles calendar day instead of the previous day', async () => {
    const handler = await getHandler()
    vi.mocked(getUserTimezone).mockResolvedValue('America/Los_Angeles')

    await handler({ query: { date: '2026-03-15' } } as any)

    expect(workoutRepositoryMock.getForUser).toHaveBeenCalledWith('user-1', {
      startDate: new Date('2026-03-15T07:00:00.000Z'),
      endDate: new Date('2026-03-16T06:59:59.999Z'),
      orderBy: { date: 'asc' }
    })
  })

  it('keeps the requested calendar day correct for Tokyo', async () => {
    const handler = await getHandler()
    vi.mocked(getUserTimezone).mockResolvedValue('Asia/Tokyo')

    await handler({ query: { date: '2026-03-15' } } as any)

    expect(workoutRepositoryMock.getForUser).toHaveBeenCalledWith('user-1', {
      startDate: new Date('2026-03-14T15:00:00.000Z'),
      endDate: new Date('2026-03-15T14:59:59.999Z'),
      orderBy: { date: 'asc' }
    })
  })
})
