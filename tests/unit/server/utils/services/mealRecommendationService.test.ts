import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mealRecommendationService } from '../../../../../server/utils/services/mealRecommendationService'
import { prisma } from '../../../../../server/utils/db'
import { metabolicService } from '../../../../../server/utils/services/metabolicService'

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

    expect(result).toEqual({
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
})
