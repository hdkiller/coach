import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('defineRouteMeta', () => undefined)
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message || err.statusMessage)
  ;(error as any).statusCode = err.statusCode
  return error
})
vi.stubGlobal('getRouterParam', (event: any, key: string) => event.context?.params?.[key])

const shareTokenFindUnique = vi.fn()
const workoutFindUnique = vi.fn()

vi.stubGlobal('prisma', {
  shareToken: { findUnique: shareTokenFindUnique },
  workout: { findUnique: workoutFindUnique }
})

describe('GET /api/share/workouts/[token]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 when token is not a workout share token', async () => {
    shareTokenFindUnique.mockResolvedValue(null)

    const mod = await import('../../../../../server/api/share/workouts/[token].get')

    await expect(
      mod.default({ context: { params: { token: 'raw-workout-id' } } })
    ).rejects.toMatchObject({
      statusCode: 404
    })
    expect(workoutFindUnique).not.toHaveBeenCalled()
  })

  it('returns workout without zone profiles on user', async () => {
    shareTokenFindUnique.mockResolvedValue({
      resourceType: 'WORKOUT',
      resourceId: 'workout-1',
      expiresAt: null
    })
    workoutFindUnique.mockResolvedValue({
      id: 'workout-1',
      userId: 'user-1',
      externalId: 'ext-1',
      title: 'Morning Ride',
      user: {
        name: 'Alex',
        image: null
      },
      streams: []
    })

    const mod = await import('../../../../../server/api/share/workouts/[token].get')
    const result = await mod.default({ context: { params: { token: 'share-token' } } })

    expect(result).toMatchObject({
      id: 'workout-1',
      title: 'Morning Ride',
      user: { name: 'Alex', image: null }
    })
    expect(result.user).not.toHaveProperty('hrZones')
    expect(result.user).not.toHaveProperty('powerZones')
    expect(result).not.toHaveProperty('userId')
    expect(result).not.toHaveProperty('externalId')
  })
})
