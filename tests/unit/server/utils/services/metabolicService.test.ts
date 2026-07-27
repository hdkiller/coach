import { beforeEach, describe, expect, it, vi } from 'vitest'
import { metabolicService } from '../../../../../server/utils/services/metabolicService'
import { prisma } from '../../../../../server/utils/db'
import { nutritionRepository } from '../../../../../server/utils/repositories/nutritionRepository'
import { workoutRepository } from '../../../../../server/utils/repositories/workoutRepository'
import { plannedWorkoutRepository } from '../../../../../server/utils/repositories/plannedWorkoutRepository'
import { getUserNutritionSettings } from '../../../../../server/utils/nutrition/settings'
import { formatUserTime } from '../../../../../server/utils/date'
import { bodyMetricResolver } from '../../../../../server/utils/services/bodyMetricResolver'
import {
  calculateGlycogenState,
  selectRelevantWorkouts
} from '../../../../../server/utils/nutrition-domain'

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    },
    athleteJourneyEvent: {
      findMany: vi.fn()
    }
  }
}))

vi.mock('../../../../../server/utils/services/bodyMetricResolver', () => ({
  bodyMetricResolver: {
    resolveEffectiveWeight: vi.fn()
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
  calculateMacroTargetCalories: vi.fn(),
  buildDayFuelingPlan: vi.fn(),
  selectRelevantWorkouts: vi.fn(),
  synthesizeRefills: vi.fn(),
  ABSORPTION_PROFILES: {}
}))

describe('metabolicService smoke coverage', () => {
  const userId = 'user-123'
  const date = new Date('2026-02-13T12:00:00.000Z')

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(bodyMetricResolver.resolveEffectiveWeight).mockResolvedValue({
      value: 70,
      source: { type: 'profile', label: 'Profile' }
    } as any)
    vi.mocked(prisma.athleteJourneyEvent.findMany).mockResolvedValue([] as any)
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

  it('getMetabolicStateForDate should not throw when recursion fallback uses metabolic floor', async () => {
    vi.mocked(getUserNutritionSettings).mockResolvedValue({
      metabolicFloor: 0.55
    } as any)
    vi.mocked(nutritionRepository.getByDate).mockResolvedValue({
      endingGlycogenPercentage: null,
      endingFluidDeficit: 120
    } as any)

    const result = await metabolicService.getMetabolicStateForDate(userId, date, 5)

    expect(getUserNutritionSettings).toHaveBeenCalledWith(userId)
    expect(result.startingGlycogen).toBeCloseTo(55)
    expect(result.startingFluid).toBe(120)
  })

  it('repairMetabolicChain should not throw in base-case fallback path', async () => {
    vi.mocked(getUserNutritionSettings).mockResolvedValue({
      metabolicFloor: 0.5
    } as any)
    vi.mocked(nutritionRepository.getByDate)
      .mockResolvedValueOnce(null as any)
      .mockResolvedValueOnce({
        endingGlycogenPercentage: null,
        endingFluidDeficit: 40
      } as any)

    const result = await metabolicService.repairMetabolicChain(
      userId,
      new Date('2026-01-01T00:00:00Z'),
      5
    )

    expect(getUserNutritionSettings).toHaveBeenCalledWith(userId)
    expect(result).toEqual({
      startingGlycogen: 50,
      startingFluid: 40
    })
  })

  describe('window identity', () => {
    it('uses the window key stamped by the day builder', () => {
      expect(
        metabolicService.getWindowKey(
          { type: 'POST_WORKOUT', windowKey: 'POST_WORKOUT#2', startTime: '2026-02-13T18:00:00Z' },
          'UTC'
        )
      ).toBe('POST_WORKOUT#2')
    })

    it('treats a key-less window as the first of its type', () => {
      expect(
        metabolicService.getWindowKey(
          { type: 'PRE_WORKOUT', startTime: '2026-02-13T08:00:00Z' },
          'UTC'
        )
      ).toBe('PRE_WORKOUT#1')
    })

    it('does not bind a legacy meal to every window sharing its type', () => {
      const legacyMeal = { windowType: 'PRE_WORKOUT' }

      expect(
        metabolicService.matchPlanMealToWindow(
          legacyMeal,
          { type: 'PRE_WORKOUT', windowKey: 'PRE_WORKOUT#1', startTime: '2026-02-13T08:00:00Z' },
          'UTC'
        )
      ).toBe(true)
      expect(
        metabolicService.matchPlanMealToWindow(
          legacyMeal,
          { type: 'PRE_WORKOUT', windowKey: 'PRE_WORKOUT#2', startTime: '2026-02-13T16:00:00Z' },
          'UTC'
        )
      ).toBe(false)
    })

    it('labels workout windows with their meal slot', () => {
      expect(
        metabolicService.buildWindowLabel(
          { type: 'PRE_WORKOUT', slotName: 'Breakfast', startTime: '2026-02-13T08:00:00Z' },
          'UTC'
        )
      ).toBe('Pre-Workout Breakfast')
      expect(
        metabolicService.buildWindowLabel(
          { type: 'INTRA_WORKOUT', startTime: '2026-02-13T10:00:00Z' },
          'UTC'
        )
      ).toBe('Intra-Workout Fueling')
    })

    it('labels a baseline window from its slot name, not the time of day', () => {
      // 15:00 local. getMealSlotName treats 11:00-16:00 as lunch, so a slot the athlete named
      // "Snack" would otherwise be labelled "Lunch" and collide with the real 12:00 lunch window -
      // which is exactly what a production plan had stored.
      vi.mocked(formatUserTime).mockReturnValue('15:00')

      expect(
        metabolicService.getMealSlotName(new Date('2026-07-27T13:00:00Z'), 'Europe/Budapest')
      ).toBe('Lunch')

      expect(
        metabolicService.buildWindowLabel(
          { type: 'DAILY_BASE', slotName: 'Snack', startTime: '2026-07-27T13:00:00Z' },
          'Europe/Budapest'
        )
      ).toBe('Snack')
    })

    it('uses the time of day only when the window has no slot name', () => {
      vi.mocked(formatUserTime).mockReturnValue('15:00')

      expect(
        metabolicService.buildWindowLabel(
          { type: 'DAILY_BASE', startTime: '2026-07-27T13:00:00Z' },
          'Europe/Budapest'
        )
      ).toBe('Lunch')
    })

    it('recomputes a stored label that disagrees with the slot name', () => {
      // Production plans carry `slotName: "Snack"` next to `label: "Lunch"` on the same window.
      // Trusting the stored label kept the wrong heading alive through every regeneration.
      vi.mocked(formatUserTime).mockReturnValue('15:00')

      expect(
        metabolicService.resolveWindowDisplayLabel(
          {
            type: 'DAILY_BASE',
            slotName: 'Snack',
            label: 'Lunch',
            startTime: '2026-07-27T13:00:00Z'
          },
          'Europe/Budapest'
        )
      ).toBe('Snack')
    })

    it('keeps a stored label when the window has no slot name to check it against', () => {
      vi.mocked(formatUserTime).mockReturnValue('15:00')

      expect(
        metabolicService.resolveWindowDisplayLabel(
          {
            type: 'PRE_WORKOUT',
            label: 'Pre-Workout Breakfast',
            startTime: '2026-07-27T13:00:00Z'
          },
          'Europe/Budapest'
        )
      ).toBe('Pre-Workout Breakfast')
    })
  })
})
