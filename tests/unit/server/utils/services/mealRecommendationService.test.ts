import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  mapWindowTypeToCatalogType,
  mealRecommendationService
} from '../../../../../server/utils/services/mealRecommendationService'
import { generateStructuredAnalysis } from '../../../../../server/utils/gemini'
import { prisma } from '../../../../../server/utils/db'
import { metabolicService } from '../../../../../server/utils/services/metabolicService'
import { bodyMetricResolver } from '../../../../../server/utils/services/bodyMetricResolver'

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    nutritionRecommendation: {
      create: vi.fn(),
      update: vi.fn()
    },
    user: {
      findUnique: vi.fn()
    },
    userNutritionSettings: {
      findUnique: vi.fn()
    },
    mealOptionCatalog: {
      findMany: vi.fn()
    }
  }
}))

vi.mock('../../../../../server/utils/services/bodyMetricResolver', () => ({
  bodyMetricResolver: {
    resolveEffectiveWeight: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/services/metabolicService', () => ({
  metabolicService: {
    getMealTargetContext: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/gemini', () => ({
  generateStructuredAnalysis: vi.fn()
}))

vi.mock('@trigger.dev/sdk/v3', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}))

describe('mealRecommendationService', () => {
  const userId = 'user-123'
  const date = new Date('2026-02-13T12:00:00.000Z')

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.nutritionRecommendation.create).mockResolvedValue({ id: 'rec-1' } as any)
    vi.mocked(prisma.nutritionRecommendation.update).mockResolvedValue({ id: 'rec-1' } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ weight: 70 } as any)
    vi.mocked(bodyMetricResolver.resolveEffectiveWeight).mockResolvedValue({
      value: 70,
      source: { type: 'profile', label: 'Profile' }
    } as any)
    vi.mocked(metabolicService.getMealTargetContext).mockResolvedValue({
      currentTank: { percentage: 80, advice: 'Stable' },
      nextFuelingWindow: null,
      windowProgress: [{ type: 'PRE_WORKOUT', unmetCarbs: 96 }]
    } as any)
  })

  it('returns catalog recommendations even when user nutrition settings are missing', async () => {
    vi.mocked(prisma.userNutritionSettings.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.mealOptionCatalog.findMany).mockResolvedValue([
      {
        id: 'm1',
        title: 'Banana + Gel',
        baseMacros: { carbs: 48, protein: 2, fat: 1, kcal: 210 },
        ingredients: [{ item: 'Banana', quantity: 1, unit: '', isScalable: true }],
        prepMinutes: 2,
        absorptionType: 'FAST',
        constraintTags: []
      },
      {
        id: 'm2',
        title: 'Toast + Honey',
        baseMacros: { carbs: 50, protein: 4, fat: 2, kcal: 240 },
        ingredients: [{ item: 'Toast', quantity: 1, unit: 'slice', isScalable: true }],
        prepMinutes: 4,
        absorptionType: 'BALANCED',
        constraintTags: []
      }
    ] as any)

    const result = await mealRecommendationService.getRecommendations(userId, date, {
      scope: 'MEAL',
      windowType: 'PRE_WORKOUT'
    })

    expect(result.status).toBe('ready')
    expect(result.source).toBe('catalog')
    expect(Array.isArray((result as any).recommendations)).toBe(true)
    expect((result as any).recommendations.length).toBeGreaterThanOrEqual(2)
    expect(prisma.userNutritionSettings.findUnique).toHaveBeenCalledWith({
      where: { userId },
      select: {
        dietaryProfile: true,
        foodAllergies: true,
        foodIntolerances: true,
        lifestyleExclusions: true
      }
    })
  })

  it('returns explicit error message when upstream context resolution fails', async () => {
    vi.mocked(metabolicService.getMealTargetContext).mockRejectedValue(
      new Error('plannedWorkoutRepository is not defined')
    )

    const result = await mealRecommendationService.getRecommendations(userId, date, {
      scope: 'MEAL',
      windowType: 'PRE_WORKOUT'
    })

    expect(result).toMatchObject({
      status: 'error',
      message: 'plannedWorkoutRepository is not defined'
    })
    expect(prisma.nutritionRecommendation.update).toHaveBeenCalledWith({
      where: { id: 'rec-1' },
      data: { status: 'FAILED' }
    })
  })

  it('uses explicit targetCarbs override and DAILY_BASE catalog mapping', async () => {
    vi.mocked(prisma.userNutritionSettings.findUnique).mockResolvedValue(null)
    vi.mocked(metabolicService.getMealTargetContext).mockResolvedValue({
      currentTank: { percentage: 34, advice: 'CRITICAL: Refuel immediately.' },
      nextFuelingWindow: null,
      windowProgress: []
    } as any)
    vi.mocked(prisma.mealOptionCatalog.findMany).mockResolvedValue([
      {
        id: 'base-1',
        title: 'Breakfast Bowl',
        baseMacros: { carbs: 62, protein: 18, fat: 9, kcal: 420 },
        ingredients: [{ item: 'Oats', quantity: 80, unit: 'g', isScalable: true }],
        prepMinutes: 8,
        absorptionType: 'BALANCED',
        constraintTags: []
      },
      {
        id: 'base-2',
        title: 'Toast + Jam',
        baseMacros: { carbs: 60, protein: 12, fat: 7, kcal: 390 },
        ingredients: [{ item: 'Toast', quantity: 2, unit: 'slice', isScalable: true }],
        prepMinutes: 6,
        absorptionType: 'FAST',
        constraintTags: []
      }
    ] as any)

    const result = await mealRecommendationService.getRecommendations(userId, date, {
      scope: 'MEAL',
      windowType: 'DAILY_BASE',
      targetCarbs: 62
    })

    expect(prisma.mealOptionCatalog.findMany).toHaveBeenCalledWith({
      where: { windowType: 'BASE' }
    })
    expect(result.status).toBe('ready')
    expect(result.source).toBe('catalog')
    expect((result as any).recommendations[0].totals.carbs).toBeGreaterThan(0)
  })

  describe('window bucket mapping', () => {
    it('maps every window identity form onto the same catalog bucket', () => {
      expect(mapWindowTypeToCatalogType('PRE_WORKOUT')).toBe('PRE')
      expect(mapWindowTypeToCatalogType('PRE_WORKOUT#2')).toBe('PRE')
      expect(mapWindowTypeToCatalogType('INTRA_WORKOUT#1.2')).toBe('INTRA')
      expect(mapWindowTypeToCatalogType('DAILY_BASE')).toBe('BASE')
      expect(mapWindowTypeToCatalogType('DAILY_BASE:breakfast')).toBe('BASE')
      expect(mapWindowTypeToCatalogType(undefined)).toBeUndefined()
    })
  })

  describe('selectFromCatalog', () => {
    const template = {
      id: 'tpl-1',
      title: 'Oatmeal',
      windowType: 'PRE',
      absorptionType: 'BALANCED',
      dietaryBuckets: [],
      constraintTags: [],
      baseMacros: { carbs: 60, protein: 8, fat: 5, kcal: 320 },
      ingredients: [
        { item: 'Oats', quantity: 60, unit: 'g', isScalable: true },
        { item: 'Honey', quantity: 6, unit: 'ml', isScalable: true }
      ],
      prepMinutes: 5
    }

    it('never suggests more carbohydrate than the day has left', async () => {
      vi.mocked(prisma.mealOptionCatalog.findMany).mockResolvedValue([template] as any)

      const options = await mealRecommendationService.selectFromCatalog(
        {
          targetContext: {
            windowProgress: [{ type: 'PRE_WORKOUT', unmetCarbs: 120 }],
            dailyCarbStatus: { remaining: 50 }
          },
          constraints: {
            dietaryProfile: [],
            foodAllergies: [],
            foodIntolerances: [],
            lifestyleExclusions: []
          },
          athlete: { weightKg: 70 }
        },
        'MEAL',
        'PRE_WORKOUT',
        { carbs: 120 }
      )

      expect(options.length).toBeGreaterThan(0)
      options.forEach((option: any) => {
        expect(option.totals.carbs).toBeLessThanOrEqual(50)
      })
    })

    it('keeps small ingredient quantities instead of rounding them away', async () => {
      vi.mocked(prisma.mealOptionCatalog.findMany).mockResolvedValue([template] as any)

      const options = await mealRecommendationService.selectFromCatalog(
        {
          targetContext: { windowProgress: [] },
          constraints: {
            dietaryProfile: [],
            foodAllergies: [],
            foodIntolerances: [],
            lifestyleExclusions: []
          },
          athlete: { weightKg: 70 }
        },
        'MEAL',
        'PRE_WORKOUT',
        { carbs: 30 }
      )

      const honey = options[0]?.ingredients.find((i: any) => i.item === 'Honey')
      // At a 0.5 scale factor this used to round to 3; the drift showed up as macros that did not
      // match the listed ingredients.
      expect(honey?.quantity).toBeCloseTo(3, 1)
      expect(honey?.quantity).toBeGreaterThan(0)
    })
  })

  describe('generateLlmRecommendation', () => {
    const baseContext = {
      targetContext: {
        windowProgress: [{ type: 'PRE_WORKOUT', unmetCarbs: 60 }],
        currentTank: { percentage: 70, advice: 'ok' },
        dailyCarbStatus: { remaining: 200 }
      },
      constraints: {
        dietaryProfile: [],
        foodAllergies: ['PEANUT'],
        foodIntolerances: [],
        lifestyleExclusions: []
      },
      athlete: { weightKg: 70 }
    }

    it('rejects options containing an allergen and retries once', async () => {
      vi.mocked(generateStructuredAnalysis)
        .mockResolvedValueOnce({
          options: [
            {
              title: 'Peanut Butter Toast',
              items: [{ item: 'Peanut Butter', quantity: 30, unit: 'g', isScalable: true }],
              totals: { carbs: 60, protein: 10, fat: 12, kcal: 400 }
            }
          ]
        } as any)
        .mockResolvedValueOnce({
          options: [
            {
              title: 'Jam Toast',
              items: [{ item: 'Strawberry Jam', quantity: 30, unit: 'g', isScalable: true }],
              totals: { carbs: 60, protein: 6, fat: 2, kcal: 300 }
            }
          ]
        } as any)

      const result: any = await mealRecommendationService.generateLlmRecommendation(
        userId,
        date,
        baseContext,
        'MEAL',
        'PRE_WORKOUT',
        { carbs: 60 }
      )

      expect(generateStructuredAnalysis).toHaveBeenCalledTimes(2)
      expect(result.status).toBe('ready')
      expect(result.options).toHaveLength(1)
      expect(result.options[0].title).toBe('Jam Toast')
    })

    it('rejects options whose carbohydrate misses the target badly', async () => {
      vi.mocked(generateStructuredAnalysis).mockResolvedValue({
        options: [
          {
            title: 'Tiny Snack',
            items: [{ item: 'Cracker', quantity: 10, unit: 'g', isScalable: true }],
            totals: { carbs: 8, protein: 1, fat: 1, kcal: 45 }
          }
        ]
      } as any)

      const result: any = await mealRecommendationService.generateLlmRecommendation(
        userId,
        date,
        baseContext,
        'MEAL',
        'PRE_WORKOUT',
        { carbs: 60 }
      )

      expect(result.status).toBe('error')
    })
  })
})
