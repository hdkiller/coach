import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requireAuth } from '../../../../../server/utils/auth-guard'

const prismaMock = {
  user: {
    findUnique: vi.fn()
  }
}
const workoutRepositoryMock = {
  getForUser: vi.fn()
}
const nutritionRepositoryMock = {
  getForUser: vi.fn()
}
const wellnessRepositoryMock = {
  getForUser: vi.fn()
}

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
vi.stubGlobal('prisma', prismaMock)
vi.stubGlobal(
  'getUserLocalDate',
  vi.fn(() => new Date('2026-03-12T00:00:00Z'))
)
vi.stubGlobal('workoutRepository', workoutRepositoryMock)
vi.stubGlobal('nutritionRepository', nutritionRepositoryMock)
vi.stubGlobal('wellnessRepository', wellnessRepositoryMock)

vi.mock('../../../../../server/utils/auth-guard', () => ({
  requireAuth: vi.fn()
}))

const getHandler = async () => {
  const mod = await import('../../../../../server/api/activity/recent.get')
  return mod.default
}

describe('GET /api/activity/recent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(workoutRepositoryMock.getForUser).mockResolvedValue([] as any)
    vi.mocked(nutritionRepositoryMock.getForUser).mockResolvedValue([] as any)
    vi.mocked(wellnessRepositoryMock.getForUser).mockResolvedValue([] as any)
  })

  it('omits nutrition entries when nutrition tracking is disabled', async () => {
    const handler = await getHandler()

    vi.mocked(prismaMock.user.findUnique).mockResolvedValue({
      timezone: 'UTC',
      nutritionTrackingEnabled: false
    } as any)
    vi.mocked(workoutRepositoryMock.getForUser).mockResolvedValue([
      {
        id: 'workout-1',
        date: new Date('2026-03-11T10:00:00Z'),
        durationSec: 3600,
        tss: 55,
        averageWatts: 210,
        averageHr: 145,
        type: 'Ride',
        source: 'intervals',
        deviceName: 'Karoo',
        title: 'Morning Ride'
      }
    ] as any)
    vi.mocked(wellnessRepositoryMock.getForUser).mockResolvedValue([
      {
        id: 'wellness-1',
        date: new Date('2026-03-12T00:00:00Z'),
        hrv: 68,
        restingHr: 48,
        sleepQuality: 8,
        sleepHours: 7.4,
        stress: 3,
        fatigue: 2,
        mood: 8,
        recoveryScore: 84,
        lastSource: 'whoop'
      }
    ] as any)

    const result = await handler({} as any)

    expect(nutritionRepositoryMock.getForUser).not.toHaveBeenCalled()
    expect(result.items.map((item: any) => item.type)).toEqual(['wellness', 'workout'])
    expect(result.count).toBe(2)
  })
})
