import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nutritionTools } from '../../../../server/utils/ai-tools/nutrition'
import { nutritionRepository } from '../../../../server/utils/repositories/nutritionRepository'
import { plannedWorkoutRepository } from '../../../../server/utils/repositories/plannedWorkoutRepository'
import { metabolicService } from '../../../../server/utils/services/metabolicService'
import { mealRecommendationService } from '../../../../server/utils/services/mealRecommendationService'
import { nutritionPlanService } from '../../../../server/utils/services/nutritionPlanService'
import { getUserNutritionSettings } from '../../../../server/utils/nutrition/settings'

vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    auditLog: {
      create: vi.fn().mockResolvedValue(null)
    },
    user: {
      findUnique: vi.fn()
    }
  }
}))

vi.mock('../../../../server/utils/repositories/nutritionRepository', () => ({
  nutritionRepository: {
    getByDate: vi.fn(),
    getForUser: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  }
}))

vi.mock('../../../../server/utils/repositories/plannedWorkoutRepository', () => ({
  plannedWorkoutRepository: {
    list: vi.fn()
  }
}))

vi.mock('../../../../server/utils/services/metabolicService', () => ({
  metabolicService: {
    calculateFuelingPlanForDate: vi.fn(),
    getMetabolicStateForDate: vi.fn(),
    getDailyTimeline: vi.fn(),
    getWaveRange: vi.fn()
  }
}))

vi.mock('../../../../server/utils/services/mealRecommendationService', () => ({
  mealRecommendationService: {
    getRecommendations: vi.fn()
  }
}))

vi.mock('../../../../server/utils/services/nutritionPlanService', () => ({
  nutritionPlanService: {
    lockMeal: vi.fn()
  }
}))

vi.mock('../../../../server/utils/nutrition/settings', () => ({
  getUserNutritionSettings: vi.fn()
}))

describe('nutrition chat tools', () => {
  const userId = 'user-123'
  const timezone = 'America/Chicago'
  const aiSettings = { aiRequireToolApproval: false } as any

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUserNutritionSettings).mockResolvedValue({
      mealPattern: null
    } as any)
    vi.mocked(plannedWorkoutRepository.list).mockResolvedValue([])
  })

  it('returns current meal items from the normalized target meal slot', async () => {
    const tools = nutritionTools(userId, timezone, aiSettings)
    const createdItem = {
      id: 'item-1',
      name: '[Sport] Banana',
      calories: 100,
      protein: 1,
      carbs: 25,
      fat: 0,
      logged_at: '2026-03-10T14:00:00.000Z'
    }

    vi.mocked(nutritionRepository.getByDate).mockResolvedValue(null)
    vi.mocked(nutritionRepository.create).mockResolvedValue({
      id: 'nutrition-1',
      snacks: [createdItem]
    } as any)
    vi.mocked(nutritionRepository.update).mockResolvedValue({
      id: 'nutrition-1',
      calories: 100,
      protein: 1,
      carbs: 25,
      fat: 0,
      snacks: [createdItem]
    } as any)

    const result = await (tools.log_nutrition_meal.execute as any)({
      date: '2026-03-10',
      meal_type: 'Sport',
      items: [
        {
          name: 'Banana',
          calories: 100,
          protein: 1,
          carbs: 25,
          fat: 0
        }
      ]
    })

    expect(result.current_meal_items).toEqual([createdItem])
  })

  it('rejects invalid dates for fueling recommendation and planning tools', async () => {
    const tools = nutritionTools(userId, timezone, aiSettings)

    const fueling = await (tools.get_fueling_recommendations.execute as any)({
      date: '2026-02-31'
    })
    const recommendations = await (tools.get_meal_recommendations.execute as any)({
      date: '2026-02-31'
    })
    const lockedMeal = await (tools.lock_meal_to_plan.execute as any)({
      date: '2026-02-31',
      window_type: 'PRE_WORKOUT',
      meal: { id: 'meal-1' }
    })

    expect(fueling.error_code).toBe('INVALID_CALENDAR_DATE')
    expect(recommendations.error_code).toBe('INVALID_CALENDAR_DATE')
    expect(lockedMeal.error_code).toBe('INVALID_CALENDAR_DATE')
    expect(plannedWorkoutRepository.list).not.toHaveBeenCalled()
    expect(mealRecommendationService.getRecommendations).not.toHaveBeenCalled()
    expect(nutritionPlanService.lockMeal).not.toHaveBeenCalled()
  })

  it('formats naive local meal timestamps without adding a ghost hour', async () => {
    const tools = nutritionTools(userId, 'Europe/Brussels', aiSettings)

    vi.mocked(nutritionRepository.getForUser).mockResolvedValue([
      {
        id: 'nutrition-1',
        date: new Date('2026-03-24T00:00:00.000Z'),
        calories: 1257,
        protein: 68,
        carbs: 139,
        fat: 47,
        fiber: null,
        sugar: null,
        waterMl: 750,
        breakfast: [],
        lunch: [
          {
            id: 'item-1',
            product_name: 'Roerei',
            logged_at: '2026-03-24 12:15:56'
          }
        ],
        dinner: [],
        snacks: [],
        aiAnalysis: null
      }
    ] as any)

    const result = await (tools.get_nutrition_log.execute as any)({
      start_date: '2026-03-24',
      end_date: '2026-03-24'
    })

    expect(result.entries[0].meals.lunch[0].logged_at_local).toBe('12:15')
  })

  it('rejects invalid dates for daily fueling status before calling metabolism services', async () => {
    const tools = nutritionTools(userId, timezone, aiSettings)

    const result = await (tools.get_daily_fueling_status.execute as any)({
      date: '2026-02-31'
    })

    expect(result.error_code).toBe('INVALID_CALENDAR_DATE')
    expect(metabolicService.getMetabolicStateForDate).not.toHaveBeenCalled()
    expect(metabolicService.getDailyTimeline).not.toHaveBeenCalled()
  })

  it('returns fueling windows in local clock time for AI consumption', async () => {
    const tools = nutritionTools(userId, 'Europe/Brussels', aiSettings)

    vi.mocked(nutritionRepository.getByDate).mockResolvedValue({
      fuelingPlan: {
        windows: [
          {
            type: 'PRE_WORKOUT',
            startTime: '2026-03-24T13:00:00.000Z',
            endTime: '2026-03-24T15:00:00.000Z'
          },
          {
            type: 'INTRA_WORKOUT',
            startTime: '2026-03-24T15:00:00.000Z',
            endTime: '2026-03-24T16:30:00.000Z'
          }
        ]
      },
      caloriesGoal: 2721,
      carbsGoal: 367,
      proteinGoal: 126,
      fatGoal: 79
    } as any)

    const result = await (tools.get_fueling_recommendations.execute as any)({
      date: '2026-03-24'
    })

    expect(result.plan.windows).toEqual([
      expect.objectContaining({
        type: 'PRE_WORKOUT',
        startTime: '14:00',
        endTime: '16:00',
        startTimeUtc: '2026-03-24T13:00:00.000Z',
        endTimeUtc: '2026-03-24T15:00:00.000Z'
      }),
      expect.objectContaining({
        type: 'INTRA_WORKOUT',
        startTime: '16:00',
        endTime: '17:30',
        startTimeUtc: '2026-03-24T15:00:00.000Z',
        endTimeUtc: '2026-03-24T16:30:00.000Z'
      })
    ])
  })

  it('patches quantity and weight-style fields on logged items', async () => {
    const tools = nutritionTools(userId, timezone, aiSettings)
    const existingItem = {
      id: 'item-1',
      name: 'Sports Drink',
      quantity: '500 ml bottle',
      amount: 500,
      unit: 'ml',
      calories: 120,
      protein: 0,
      carbs: 30,
      fat: 0,
      water_ml: 500,
      logged_at: '2026-03-10T14:00:00.000Z'
    }

    vi.mocked(nutritionRepository.getByDate).mockResolvedValue({
      id: 'nutrition-1',
      snacks: [existingItem]
    } as any)

    vi.mocked(nutritionRepository.update)
      .mockResolvedValueOnce({
        id: 'nutrition-1',
        snacks: [
          {
            ...existingItem,
            quantity: '750 ml bottle',
            amount: 750,
            unit: 'ml',
            water_ml: 750,
            fluidMl: 750,
            hydrationContributionMl: 750
          }
        ]
      } as any)
      .mockResolvedValueOnce({
        id: 'nutrition-1',
        calories: 120,
        protein: 0,
        carbs: 30,
        fat: 0,
        waterMl: 750
      } as any)

    const result = await (tools.patch_nutrition_items.execute as any)({
      date: '2026-03-10',
      meal_type: 'snacks',
      updates: [
        {
          item_id: 'item-1',
          quantity: '750 ml bottle',
          amount: 750,
          unit: 'ml',
          water_ml: 750
        }
      ]
    })

    expect(nutritionRepository.update).toHaveBeenNthCalledWith(1, 'nutrition-1', {
      snacks: [
        expect.objectContaining({
          id: 'item-1',
          quantity: '750 ml bottle',
          amount: 750,
          unit: 'ml',
          water_ml: 750,
          fluidMl: 750,
          hydrationContributionMl: 750
        })
      ]
    })
    expect(result.totals.water_ml).toBe(750)
  })
})
