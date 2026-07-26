import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nutritionPlanService } from '../../../../../server/utils/services/nutritionPlanService'
import { prisma } from '../../../../../server/utils/db'
import { getUserTimezone } from '../../../../../server/utils/date'
import { slugifySlot } from '../../../../../server/utils/nutrition-domain/day-plan'

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    nutritionPlan: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn()
    },
    nutritionPlanMeal: {
      upsert: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn()
    },
    nutrition: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    userNutritionSettings: {
      findUnique: vi.fn()
    },
    user: {
      findUnique: vi.fn()
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

  describe('getGroceryList', () => {
    // Distinct windowTypes: getPlanForRange keeps one meal per date+windowType.
    const mealWith = (ingredients: any[], id = 'meal-1', windowType = 'DAILY_BASE:breakfast') => ({
      id,
      windowType,
      date: new Date('2026-02-15T00:00:00.000Z'),
      status: 'PLANNED',
      mealJson: { title: 'Porridge', ingredients }
    })

    function mockPlan(meals: any[]) {
      vi.mocked(prisma.nutritionPlan.findMany).mockResolvedValue([
        { id: 'plan-1', updatedAt: new Date('2026-02-15T10:00:00.000Z'), meals }
      ] as any)
    }

    it('sums quantities of the same ingredient and unit', async () => {
      mockPlan([
        mealWith([{ item: 'Oats', quantity: 80, unit: 'g' }], 'meal-1', 'DAILY_BASE:breakfast'),
        mealWith([{ item: 'Oats', quantity: 40, unit: 'g' }], 'meal-2', 'DAILY_BASE:lunch')
      ])

      const result = await nutritionPlanService.getGroceryList(
        'user-1',
        new Date('2026-02-15T00:00:00.000Z'),
        new Date('2026-02-15T23:59:59.999Z')
      )

      expect(result.items).toHaveLength(1)
      expect(result.items[0]?.quantity).toBe(120)
    })

    it('does not let a non-numeric quantity poison the aggregated total', async () => {
      // mealJson is AI-generated, so 'two' is a quantity that really arrives. Number('two') is NaN,
      // and one NaN made every later += for that ingredient NaN too.
      mockPlan([
        mealWith([{ item: 'Oats', quantity: 80, unit: 'g' }], 'meal-1', 'DAILY_BASE:breakfast'),
        mealWith([{ item: 'Oats', quantity: 'two', unit: 'g' }], 'meal-2', 'DAILY_BASE:lunch'),
        mealWith([{ item: 'Oats', quantity: 40, unit: 'g' }], 'meal-3', 'DAILY_BASE:dinner')
      ])

      const result = await nutritionPlanService.getGroceryList(
        'user-1',
        new Date('2026-02-15T00:00:00.000Z'),
        new Date('2026-02-15T23:59:59.999Z')
      )

      expect(result.items[0]?.quantity).toBe(120)
      expect(Number.isNaN(result.items[0]?.quantity)).toBe(false)
    })

    it('treats a leading non-numeric quantity as zero rather than NaN', async () => {
      mockPlan([mealWith([{ item: 'Salt', quantity: 'a pinch', unit: '' }])])

      const result = await nutritionPlanService.getGroceryList(
        'user-1',
        new Date('2026-02-15T00:00:00.000Z'),
        new Date('2026-02-15T23:59:59.999Z')
      )

      expect(result.items[0]?.quantity).toBe(0)
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

      expect(prisma.nutritionPlan.findFirst).toHaveBeenNthCalledWith(2, {
        where: {
          userId: 'user-1',
          startDate: { lte: new Date('2026-02-15T00:00:00.000Z') },
          endDate: { gte: new Date('2026-02-15T00:00:00.000Z') }
        },
        include: {
          meals: {
            where: { date: new Date('2026-02-15T00:00:00.000Z') },
            orderBy: { scheduledAt: 'asc' }
          }
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

  describe('window keys', () => {
    it('prefers an explicit window key over the bare type', () => {
      expect(
        nutritionPlanService.resolveWindowKey({ type: 'PRE_WORKOUT', windowKey: 'PRE_WORKOUT#2' })
      ).toBe('PRE_WORKOUT#2')
    })

    it('falls back to a slot-specific key for baseline windows', () => {
      expect(
        nutritionPlanService.resolveWindowKey({ type: 'DAILY_BASE', slotName: 'Breakfast' })
      ).toBe('DAILY_BASE:breakfast')
    })

    it('derives a legacy window key the same way the plan generator does', () => {
      // This slugifier and the generator's disagreed on trailing punctuation, so a meal locked
      // against a slot named 'Lunch!' stopped matching the window it belonged to.
      expect(nutritionPlanService.toDailyBaseWindowKey('Lunch!')).toBe(
        `DAILY_BASE:${slugifySlot('Lunch!')}`
      )
      expect(nutritionPlanService.toDailyBaseWindowKey('Post ride ')).toBe(
        `DAILY_BASE:${slugifySlot('Post ride ')}`
      )
      expect(nutritionPlanService.toDailyBaseWindowKey('☕️')).toBe(
        `DAILY_BASE:${slugifySlot('☕️')}`
      )
    })

    it('matches a meal to its own window and not to a sibling of the same type', () => {
      const first = { type: 'PRE_WORKOUT', windowKey: 'PRE_WORKOUT#1' }
      const second = { type: 'PRE_WORKOUT', windowKey: 'PRE_WORKOUT#2' }
      const meal = { windowType: 'PRE_WORKOUT#2' }

      expect(nutritionPlanService.matchPlanMealToWindow(meal, second)).toBe(true)
      expect(nutritionPlanService.matchPlanMealToWindow(meal, first)).toBe(false)
    })

    it('binds a legacy bare-type meal to the first window of that type only', () => {
      const legacyMeal = { windowType: 'PRE_WORKOUT' }

      expect(
        nutritionPlanService.matchPlanMealToWindow(legacyMeal, {
          type: 'PRE_WORKOUT',
          windowKey: 'PRE_WORKOUT#1'
        })
      ).toBe(true)
      expect(
        nutritionPlanService.matchPlanMealToWindow(legacyMeal, {
          type: 'PRE_WORKOUT',
          windowKey: 'PRE_WORKOUT#2'
        })
      ).toBe(false)
    })

    it('persists two same-type windows as two separate plan meals', async () => {
      vi.mocked(prisma.nutritionPlan.findFirst).mockResolvedValue({ id: 'plan-1' } as any)
      vi.mocked(prisma.nutrition.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.nutritionPlanMeal.upsert).mockImplementation((async (args: any) => ({
        id: `meal-${args.where.planId_date_windowType.windowType}`,
        planId: 'plan-1',
        date: new Date('2026-02-15T00:00:00.000Z'),
        windowType: args.where.planId_date_windowType.windowType,
        scheduledAt: new Date('2026-02-15T00:00:00.000Z')
      })) as any)

      await nutritionPlanService.lockMeal(
        'user-1',
        '2026-02-15',
        'PRE_WORKOUT',
        { title: 'Morning Oats', totals: { carbs: 60 } },
        undefined,
        { windowKey: 'PRE_WORKOUT#1' }
      )
      await nutritionPlanService.lockMeal(
        'user-1',
        '2026-02-15',
        'PRE_WORKOUT',
        { title: 'Evening Rice Cakes', totals: { carbs: 45 } },
        undefined,
        { windowKey: 'PRE_WORKOUT#2' }
      )

      const persistedWindowTypes = vi
        .mocked(prisma.nutritionPlanMeal.upsert)
        .mock.calls.map((call: any) => call[0].where.planId_date_windowType.windowType)

      // Before stable keys both locks collapsed onto a single PRE_WORKOUT row.
      expect(persistedWindowTypes).toEqual(['PRE_WORKOUT#1', 'PRE_WORKOUT#2'])
    })

    it('still writes a bare type when no window key is supplied', async () => {
      vi.mocked(prisma.nutritionPlan.findFirst).mockResolvedValue({ id: 'plan-1' } as any)
      vi.mocked(prisma.nutrition.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.nutritionPlanMeal.upsert).mockResolvedValue({
        id: 'plan-meal-1',
        planId: 'plan-1',
        date: new Date('2026-02-15T00:00:00.000Z'),
        windowType: 'POST_WORKOUT',
        scheduledAt: new Date('2026-02-15T00:00:00.000Z')
      } as any)

      await nutritionPlanService.lockMeal('user-1', '2026-02-15', 'POST_WORKOUT', {
        title: 'Recovery Shake',
        totals: { carbs: 50 }
      })

      expect(prisma.nutritionPlanMeal.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            planId_date_windowType: expect.objectContaining({ windowType: 'POST_WORKOUT' })
          })
        })
      )
    })
  })
})
