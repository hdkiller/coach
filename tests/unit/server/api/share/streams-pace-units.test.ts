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

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    shareToken: { findUnique: shareTokenFindUnique },
    workout: { findUnique: workoutFindUnique }
  }
}))

const findByWorkoutId = vi.fn()

vi.mock('../../../../../server/utils/repositories/workoutStreamRepository', () => ({
  workoutStreamRepository: { findByWorkoutId }
}))

function makeRawSplitsWorkout(distanceUnits: string | null) {
  return {
    id: 'workout-1',
    userId: 'user-1',
    user: { distanceUnits },
    rawJson: {
      splits_metric: [
        // 1000m in 300s -> 300 seconds/km
        { distance: 1000, moving_time: 300, average_heartrate: 150, average_speed: 3.33 },
        // 1000m in 330s -> 330 seconds/km
        { distance: 1000, moving_time: 330, average_heartrate: 155, average_speed: 3.03 }
      ]
    }
  }
}

describe('GET /api/share/workouts/[token]/streams pace unit handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    findByWorkoutId.mockResolvedValue(null)
    shareTokenFindUnique.mockResolvedValue({
      resourceType: 'WORKOUT',
      resourceId: 'workout-1',
      expiresAt: null
    })
  })

  it('formats lap pace in /km for a Kilometers-preference athlete (unaffected/existing behavior)', async () => {
    workoutFindUnique.mockResolvedValue(makeRawSplitsWorkout('Kilometers'))

    const mod = await import('../../../../../server/api/share/workouts/[token]/streams.get')
    const result = await mod.default({ context: { params: { token: 'share-token' } } })

    expect(result.lapSplits[0].pace).toBe('5:00/km')
    expect(result.lapSplits[1].pace).toBe('5:30/km')
  })

  it('formats lap pace in /mi for a Miles-preference athlete', async () => {
    workoutFindUnique.mockResolvedValue(makeRawSplitsWorkout('Miles'))

    const mod = await import('../../../../../server/api/share/workouts/[token]/streams.get')
    const result = await mod.default({ context: { params: { token: 'share-token' } } })

    expect(result.lapSplits[0].pace).toBe('8:03/mi')
    expect(result.lapSplits[1].pace).toBe('8:51/mi')
  })

  it('defaults to /km when the workout owner has no distance unit preference on record', async () => {
    workoutFindUnique.mockResolvedValue(makeRawSplitsWorkout(null))

    const mod = await import('../../../../../server/api/share/workouts/[token]/streams.get')
    const result = await mod.default({ context: { params: { token: 'share-token' } } })

    expect(result.lapSplits[0].pace).toBe('5:00/km')
  })
})
