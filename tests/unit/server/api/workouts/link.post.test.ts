import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getServerSession } from '../../../../../server/utils/session'
import { prisma } from '../../../../../server/utils/db'
import { getUserTimezone } from '../../../../../server/utils/date'
import { isNutritionTrackingEnabled } from '../../../../../server/utils/nutrition/feature'
import { metabolicService } from '../../../../../server/utils/services/metabolicService'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('defineRouteMeta', () => {})
vi.stubGlobal('getRouterParam', (_event: any, key: string) => _event.context.params[key])
vi.stubGlobal('readBody', async (event: any) => event.body)
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
    workout: {
      findUnique: vi.fn()
    },
    plannedWorkout: {
      findUnique: vi.fn()
    },
    $transaction: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/date', () => ({
  formatDateUTC: vi.fn((date: Date) => date.toISOString().split('T')[0]),
  formatUserDate: vi.fn((date: Date, _timezone: string) => date.toISOString().split('T')[0]),
  getUserTimezone: vi.fn()
}))

vi.mock('../../../../../server/utils/nutrition/feature', () => ({
  isNutritionTrackingEnabled: vi.fn()
}))

vi.mock('../../../../../server/utils/services/metabolicService', () => ({
  metabolicService: {
    calculateFuelingPlanForDate: vi.fn()
  }
}))

const getHandler = async () => {
  const mod = await import('../../../../../server/api/workouts/[id]/link.post')
  return mod.default
}

describe('POST /api/workouts/[id]/link', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as any)
    vi.mocked(getUserTimezone).mockResolvedValue('America/Chicago')
    vi.mocked(isNutritionTrackingEnabled).mockResolvedValue(false)
  })

  it('rejects linking workouts from different local days', async () => {
    const handler = await getHandler()

    vi.mocked(prisma.workout.findUnique).mockResolvedValue({
      id: 'workout-1',
      userId: 'user-1',
      date: new Date('2026-03-28T18:22:47Z')
    } as any)
    vi.mocked(prisma.plannedWorkout.findUnique).mockResolvedValue({
      id: 'planned-1',
      userId: 'user-1',
      date: new Date('2026-03-29T00:00:00Z')
    } as any)

    await expect(
      handler({
        context: { params: { id: 'workout-1' } },
        body: { plannedWorkoutId: 'planned-1' }
      } as any)
    ).rejects.toMatchObject({
      message: 'Workout and planned workout must be on the same day to link.',
      statusCode: 400
    })

    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(metabolicService.calculateFuelingPlanForDate).not.toHaveBeenCalled()
  })
})
