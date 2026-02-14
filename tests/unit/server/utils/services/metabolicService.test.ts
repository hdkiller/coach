import { beforeEach, describe, expect, it, vi } from 'vitest'
import { metabolicService } from '../../../../../server/utils/services/metabolicService'
import { prisma } from '../../../../../server/utils/db'
import { nutritionRepository } from '../../../../../server/utils/repositories/nutritionRepository'
import { workoutRepository } from '../../../../../server/utils/repositories/workoutRepository'
import { plannedWorkoutRepository } from '../../../../../server/utils/repositories/plannedWorkoutRepository'
import { getUserNutritionSettings } from '../../../../../server/utils/nutrition/settings'
import {
  calculateGlycogenState,
  selectRelevantWorkouts
} from '../../../../../server/utils/nutrition-domain'

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    }
  }
}))

vi.mock('../../../../../server/utils/repositories/nutritionRepository', () => ({
  nutritionRepository: {
    getByDate: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/repositories/workoutRepository', () => ({
  workoutRepository: {
    getForUser: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/repositories/plannedWorkoutRepository', () => ({
  plannedWorkoutRepository: {
    list: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/nutrition/settings', () => ({
  getUserNutritionSettings: vi.fn()
}))

vi.mock('../../../../../server/utils/date', () => ({
  getUserTimezone: vi.fn().mockResolvedValue('UTC'),
  getUserLocalDate: vi.fn().mockReturnValue(new Date('2026-02-13T00:00:00.000Z')),
  getStartOfDayUTC: vi.fn().mockReturnValue(new Date('2026-02-13T00:00:00.000Z')),
  getEndOfDayUTC: vi.fn().mockReturnValue(new Date('2026-02-13T23:59:59.999Z')),
  buildZonedDateTimeFromUtcDate: vi.fn(),
  formatDateUTC: vi.fn().mockReturnValue('2026-02-13'),
  formatUserTime: vi.fn().mockReturnValue('10:00')
}))

vi.mock('../../../../../server/utils/nutrition-domain', () => ({
  calculateEnergyTimeline: vi.fn(),
  calculateGlycogenState: vi.fn(),
  calculateFuelingStrategy: vi.fn(),
  calculateDailyCalorieBreakdown: vi.fn(),
  mergeFuelingWindows: vi.fn(),
  selectRelevantWorkouts: vi.fn(),
  synthesizeRefills: vi.fn(),
  ABSORPTION_PROFILES: {}
}))

describe('metabolicService smoke coverage', () => {
  const userId = 'user-123'
  const date = new Date('2026-02-13T12:00:00.000Z')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getRelevantWorkouts should include planned workouts repository in merge flow', async () => {
    const completed = [{ id: 'w1' }]
    const planned = [{ id: 'p1' }]
    const merged = [{ id: 'merged' }]

    vi.mocked(workoutRepository.getForUser).mockResolvedValue(completed as any)
    vi.mocked(plannedWorkoutRepository.list).mockResolvedValue(planned as any)
    vi.mocked(selectRelevantWorkouts).mockReturnValue(merged as any)

    const result = await metabolicService.getRelevantWorkouts(userId, date, 'UTC')

    expect(workoutRepository.getForUser).toHaveBeenCalled()
    expect(plannedWorkoutRepository.list).toHaveBeenCalledWith(userId, {
      startDate: date,
      endDate: date
    })
    expect(selectRelevantWorkouts).toHaveBeenCalledWith(completed, planned)
    expect(result).toEqual(merged)
  })

  it('getGlycogenState should execute without reference errors and use nutrition settings', async () => {
    vi.mocked(getUserNutritionSettings).mockResolvedValue({
      fuelState1Min: 3
    } as any)
    vi.mocked(nutritionRepository.getByDate).mockResolvedValue(null as any)
    vi.mocked(workoutRepository.getForUser).mockResolvedValue([] as any)
    vi.mocked(plannedWorkoutRepository.list).mockResolvedValue([] as any)
    vi.mocked(selectRelevantWorkouts).mockReturnValue([] as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ weight: 70 } as any)
    vi.mocked(calculateGlycogenState).mockReturnValue({ percentage: 78 } as any)

    const result = await metabolicService.getGlycogenState(userId, date, 90, new Date(date))

    expect(getUserNutritionSettings).toHaveBeenCalledWith(userId)
    expect(calculateGlycogenState).toHaveBeenCalled()
    expect(result).toEqual({ percentage: 78 })
  })
})
