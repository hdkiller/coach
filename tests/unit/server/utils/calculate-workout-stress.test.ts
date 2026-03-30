import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '../../../../server/utils/db'
import {
  calculateWorkoutStress,
  recalculateStressAfterDate
} from '../../../../server/utils/calculate-workout-stress'
import { calculateATL, calculateCTL } from '../../../../server/utils/training-stress'

vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    workout: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn()
    }
  }
}))

vi.mock('../../../../server/utils/training-stress', () => ({
  calculateCTL: vi.fn((previous: number, todayTss: number) => previous + todayTss + 0.1),
  calculateATL: vi.fn((previous: number, todayTss: number) => previous + todayTss + 0.2),
  getStressScore: vi.fn(
    (workout: { tss?: number | null; trimp?: number | null }) => workout.tss ?? workout.trimp ?? 0
  )
}))

vi.mock('../../../../server/utils/repositories/userRepository', () => ({
  userRepository: {
    getFtpForDate: vi.fn()
  }
}))

vi.mock('../../../../server/utils/normalize-tss', () => ({
  normalizeTSS: vi.fn()
}))

describe('calculate-workout-stress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses Intervals raw CTL/ATL as the source of truth for single-workout updates', async () => {
    vi.mocked(prisma.workout.findUnique).mockResolvedValue({
      id: 'w-1',
      date: new Date('2026-03-22T16:00:00.000Z'),
      tss: 51,
      trimp: null,
      ctl: null,
      atl: null,
      source: 'intervals',
      rawJson: {
        icu_ctl: 56.63973,
        icu_atl: 56.731964
      }
    } as any)
    vi.mocked(prisma.workout.update).mockResolvedValue({ id: 'w-1' } as any)

    const result = await calculateWorkoutStress('w-1', 'user-1')

    expect(result).toEqual({
      ctl: 56.63973,
      atl: 56.731964
    })
    expect(prisma.workout.update).toHaveBeenCalledWith({
      where: { id: 'w-1' },
      data: {
        ctl: 56.63973,
        atl: 56.731964
      }
    })
  })

  it('preserves Intervals raw CTL/ATL during bulk recalculation after dedupe', async () => {
    vi.mocked(prisma.workout.findFirst).mockResolvedValue({
      ctl: 40,
      atl: 50,
      source: 'strava',
      rawJson: null
    } as any)
    vi.mocked(prisma.workout.findMany).mockResolvedValue([
      {
        id: 'intervals-workout',
        source: 'intervals',
        rawJson: {
          icu_ctl: 55,
          icu_atl: 65
        },
        ctl: 12,
        atl: 14,
        tss: 20,
        trimp: null
      },
      {
        id: 'strava-workout',
        source: 'strava',
        rawJson: null,
        ctl: null,
        atl: null,
        tss: 30,
        trimp: null
      }
    ] as any)
    vi.mocked(prisma.workout.update).mockResolvedValue({} as any)

    const updatedCount = await recalculateStressAfterDate('user-1', new Date('2026-03-08'))

    expect(updatedCount).toBe(2)
    expect(calculateCTL).toHaveBeenCalledWith(55, 30)
    expect(calculateATL).toHaveBeenCalledWith(65, 30)
    expect(prisma.workout.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'intervals-workout' },
      data: { ctl: 55, atl: 65 }
    })
    expect(prisma.workout.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'strava-workout' },
      data: { ctl: 85.1, atl: 95.2 }
    })
  })
})
