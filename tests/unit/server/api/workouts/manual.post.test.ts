import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requireAuth } from '../../../../../server/utils/auth-guard'
import { prisma } from '../../../../../server/utils/db'
import { calculateWorkoutStress } from '../../../../../server/utils/calculate-workout-stress'
import { isNutritionTrackingEnabled } from '../../../../../server/utils/nutrition/feature'

const workoutRepositoryMock = {
  create: vi.fn()
}

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('defineRouteMeta', () => {})
vi.stubGlobal('readBody', async (event: any) => event.body)
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
  prisma: {
    plannedWorkout: {
      findFirst: vi.fn(),
      update: vi.fn()
    }
  }
}))

vi.mock('../../../../../server/utils/calculate-workout-stress', () => ({
  calculateWorkoutStress: vi.fn()
}))

vi.mock('../../../../../server/utils/nutrition/feature', () => ({
  isNutritionTrackingEnabled: vi.fn()
}))

vi.mock('../../../../../server/utils/services/metabolicService', () => ({
  metabolicService: {
    calculateFuelingPlanForDate: vi.fn()
  }
}))

const getHandler = async () =>
  (await import('../../../../../server/api/workouts/manual.post')).default

const body = {
  title: 'Manual ride',
  date: '2026-07-28T08:00:00.000Z',
  durationSec: '3600',
  plannedWorkoutId: 'planned-1'
}

describe('POST /api/workouts/manual', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(isNutritionTrackingEnabled).mockResolvedValue(false)
  })

  it('rejects a foreign planned workout before creating or updating anything', async () => {
    const handler = await getHandler()
    vi.mocked(prisma.plannedWorkout.findFirst).mockResolvedValue(null)

    await expect(handler({ context: {}, body } as any)).rejects.toMatchObject({
      message: 'Planned workout not found',
      statusCode: 404
    })

    expect(prisma.plannedWorkout.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'planned-1',
        userId: 'user-1'
      },
      select: { id: true }
    })
    expect(workoutRepositoryMock.create).not.toHaveBeenCalled()
    expect(prisma.plannedWorkout.update).not.toHaveBeenCalled()
  })

  it('scopes the completion update to an owned planned workout', async () => {
    const handler = await getHandler()
    vi.mocked(prisma.plannedWorkout.findFirst).mockResolvedValue({ id: 'planned-1' } as any)
    workoutRepositoryMock.create.mockResolvedValue({
      id: 'workout-1',
      date: new Date(body.date)
    })
    vi.mocked(calculateWorkoutStress).mockResolvedValue({ ctl: 10, atl: 12 } as any)
    vi.mocked(prisma.plannedWorkout.update).mockResolvedValue({ id: 'planned-1' } as any)

    await expect(handler({ context: {}, body } as any)).resolves.toMatchObject({
      success: true,
      workout: { id: 'workout-1' }
    })

    expect(prisma.plannedWorkout.update).toHaveBeenCalledWith({
      where: {
        id: 'planned-1',
        userId: 'user-1'
      },
      data: {
        completed: true,
        completionStatus: 'COMPLETED'
      }
    })
  })
})
