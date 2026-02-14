import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nutritionPlanService } from '../../../../../server/utils/services/nutritionPlanService'
import { prisma } from '../../../../../server/utils/db'
import { getUserTimezone } from '../../../../../server/utils/date'

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    nutritionPlan: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn()
    },
    nutritionPlanMeal: {
      upsert: vi.fn()
    },
    nutrition: {
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}))

vi.mock('../../../../../server/utils/date', () => ({
  getUserTimezone: vi.fn()
}))

vi.mock('../../../../../server/utils/services/metabolicService', () => ({
  metabolicService: {
    getNutritionDay: vi.fn()
  }
}))

describe('nutritionPlanService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUserTimezone).mockResolvedValue('America/Chicago')
  })

  describe('getPlanForRange', () => {
    it('merges meals from overlapping plans and keeps newest per date+windowType', async () => {
      const olderMeal = {
        id: 'meal-old',
        date: new Date('2026-02-15T00:00:00.000Z'),
        windowType: 'DAILY_BASE:breakfast',
        scheduledAt: new Date('2026-02-15T07:00:00.000Z'),
        updatedAt: new Date('2026-02-15T08:00:00.000Z'),
        mealJson: { title: 'Old Breakfast' }
      }
      const newerMeal = {
        id: 'meal-new',
        date: new Date('2026-02-15T00:00:00.000Z'),
        windowType: 'DAILY_BASE:breakfast',
        scheduledAt: new Date('2026-02-15T07:00:00.000Z'),
        updatedAt: new Date('2026-02-15T09:00:00.000Z'),
        mealJson: { title: 'New Breakfast' }
      }
      const secondMeal = {
        id: 'meal-lunch',
        date: new Date('2026-02-15T00:00:00.000Z'),
        windowType: 'DAILY_BASE:lunch',
        scheduledAt: new Date('2026-02-15T12:00:00.000Z'),
        updatedAt: new Date('2026-02-15T09:30:00.000Z'),
        mealJson: { title: 'Lunch' }
      }

      vi.mocked(prisma.nutritionPlan.findMany).mockResolvedValue([
        {
          id: 'plan-primary',
          updatedAt: new Date('2026-02-15T10:00:00.000Z'),
          meals: [newerMeal]
        },
        {
          id: 'plan-older',
          updatedAt: new Date('2026-02-14T10:00:00.000Z'),
          meals: [olderMeal, secondMeal]
        }
      ] as any)

      const result = await nutritionPlanService.getPlanForRange(
        'user-1',
        new Date('2026-02-09T00:00:00.000Z'),
        new Date('2026-02-15T23:59:59.999Z')
      )

      expect(prisma.nutritionPlan.findMany).toHaveBeenCalled()
      expect(result?.id).toBe('plan-primary')
      expect(result?.meals).toHaveLength(2)
      expect(result?.meals.find((m: any) => m.windowType === 'DAILY_BASE:breakfast')?.id).toBe(
        'meal-new'
      )
      expect(result?.meals.find((m: any) => m.windowType === 'DAILY_BASE:lunch')?.id).toBe(
        'meal-lunch'
      )
    })
  })

  describe('lockMeal', () => {
    it('uses exact YYYY-MM-DD key and slot-specific DAILY_BASE window type', async () => {
      vi.mocked(prisma.nutritionPlan.findFirst).mockResolvedValue({
        id: 'plan-1'
      } as any)
      vi.mocked(prisma.nutritionPlanMeal.upsert).mockResolvedValue({
        id: 'plan-meal-1',
        planId: 'plan-1',
        date: new Date('2026-02-15T00:00:00.000Z'),
        windowType: 'DAILY_BASE:breakfast',
        scheduledAt: new Date('2026-02-15T00:00:00.000Z')
      } as any)
      vi.mocked(prisma.nutrition.findUnique).mockResolvedValue(null)

      await nutritionPlanService.lockMeal(
        'user-1',
        '2026-02-15',
        'DAILY_BASE',
        { title: 'Breakfast Bowl', totals: { carbs: 80, protein: 35 } },
        'Breakfast'
      )

      expect(prisma.nutritionPlan.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          startDate: { lte: new Date('2026-02-15T00:00:00.000Z') },
          endDate: { gte: new Date('2026-02-15T00:00:00.000Z') }
        }
      })

      expect(prisma.nutritionPlanMeal.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            planId_date_windowType: {
              planId: 'plan-1',
              date: new Date('2026-02-15T00:00:00.000Z'),
              windowType: 'DAILY_BASE:breakfast'
            }
          },
          create: expect.objectContaining({
            date: new Date('2026-02-15T00:00:00.000Z'),
            windowType: 'DAILY_BASE:breakfast',
            scheduledAt: new Date('2026-02-15T00:00:00.000Z')
          })
        })
      )
    })

    it('throws for invalid date input', async () => {
      await expect(
        nutritionPlanService.lockMeal(
          'user-1',
          'not-a-date',
          'DAILY_BASE',
          { title: 'Invalid', totals: {} },
          'Breakfast'
        )
      ).rejects.toThrow('Invalid date for lockMeal')
    })

    it('normalizes flat meal fields into totals and uses name as title', async () => {
      vi.mocked(prisma.nutritionPlan.findFirst).mockResolvedValue({
        id: 'plan-1'
      } as any)
      vi.mocked(prisma.nutritionPlanMeal.upsert).mockResolvedValue({
        id: 'plan-meal-1',
        planId: 'plan-1',
        date: new Date('2026-02-14T00:00:00.000Z'),
        windowType: 'PRE_WORKOUT',
        scheduledAt: new Date('2026-02-14T00:00:00.000Z')
      } as any)
      vi.mocked(prisma.nutrition.findUnique).mockResolvedValue(null)

      await nutritionPlanService.lockMeal('user-1', '2026-02-14', 'PRE_WORKOUT', {
        carbs: 70,
        name: 'Toast Crusher (2 Slices Toast with Honey/Jam)',
        fat: 2,
        calories: 320,
        protein: 5
      })

      expect(prisma.nutritionPlanMeal.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            mealJson: expect.objectContaining({
              title: 'Toast Crusher (2 Slices Toast with Honey/Jam)',
              totals: {
                carbs: 70,
                protein: 5,
                kcal: 320,
                fat: 2
              }
            })
          })
        })
      )
    })

    it('writes lockedMeal into fueling plan windows without scope errors', async () => {
      vi.mocked(prisma.nutritionPlan.findFirst).mockResolvedValue({
        id: 'plan-1'
      } as any)

      const persistedMeal = {
        id: 'plan-meal-1',
        planId: 'plan-1',
        date: new Date('2026-02-14T00:00:00.000Z'),
        windowType: 'PRE_WORKOUT',
        scheduledAt: new Date('2026-02-14T00:00:00.000Z'),
        mealJson: { title: 'Banana + Gel', totals: { carbs: 45 } }
      }
      vi.mocked(prisma.nutritionPlanMeal.upsert).mockResolvedValue(persistedMeal as any)

      vi.mocked(prisma.nutrition.findUnique).mockResolvedValue({
        id: 'nutrition-1',
        fuelingPlan: {
          windows: [{ type: 'PRE_WORKOUT', label: 'Before workout', isLocked: false }]
        }
      } as any)

      await nutritionPlanService.lockMeal('user-1', '2026-02-14', 'PRE_WORKOUT', {
        title: 'Banana + Gel',
        totals: { carbs: 45 }
      })

      expect(prisma.nutrition.update).toHaveBeenCalledWith({
        where: { id: 'nutrition-1' },
        data: {
          fuelingPlan: {
            windows: [
              {
                type: 'PRE_WORKOUT',
                label: 'Before workout',
                isLocked: true,
                lockedMealId: 'plan-meal-1',
                lockedMeal: { title: 'Banana + Gel', totals: { carbs: 45 } }
              }
            ]
          }
        }
      })
    })
  })
})
