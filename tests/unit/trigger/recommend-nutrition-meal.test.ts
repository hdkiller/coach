import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../trigger/init', () => ({}))

const { update, findUnique, create } = vi.hoisted(() => ({
  update: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn()
}))

vi.mock('../../../server/utils/db', () => ({
  prisma: {
    nutritionRecommendation: { update, findUnique, create }
  }
}))

vi.mock('../../../server/utils/quotas/engine', () => ({
  checkQuota: vi.fn()
}))

vi.mock('../../../server/utils/services/mealRecommendationService', () => ({
  mealRecommendationService: { getRecommendations: vi.fn() }
}))

vi.mock('@trigger.dev/sdk/v3', async () => {
  const actual = await vi.importActual('@trigger.dev/sdk/v3')
  return {
    ...actual,
    logger: {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    },
    task: vi.fn().mockImplementation((config) => ({
      run: config.run,
      id: config.id
    }))
  }
})

describe('recommendNutritionMealTask', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('merges quota error info into the existing contextJson instead of replacing it', async () => {
    const { checkQuota } = await import('../../../server/utils/quotas/engine')
    const quotaError: any = new Error('Quota exceeded')
    quotaError.statusCode = 429
    vi.mocked(checkQuota).mockRejectedValue(quotaError)

    findUnique.mockResolvedValue({
      contextJson: { requestedTargets: { carbs: 50, protein: 20, kcal: 400 } }
    })

    const { recommendNutritionMealTask } = await import('../../../trigger/recommend-nutrition-meal')

    const result = await recommendNutritionMealTask.run({
      userId: 'user-1',
      date: '2026-07-31',
      windowType: 'PRE_WORKOUT',
      recommendationId: 'rec-1'
    })

    expect(result).toEqual({ success: false, reason: 'QUOTA_EXCEEDED' })
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'rec-1' },
      select: { contextJson: true }
    })
    expect(update).toHaveBeenCalledWith({
      where: { id: 'rec-1' },
      data: {
        status: 'FAILED',
        contextJson: {
          requestedTargets: { carbs: 50, protein: 20, kcal: 400 },
          error: 'QUOTA_EXCEEDED'
        }
      }
    })
  })
})
