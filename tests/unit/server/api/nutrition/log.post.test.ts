import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requireAuth } from '../../../../../server/utils/auth-guard'
import {
  CONCURRENT_UPDATE_CONFLICT,
  nutritionRepository
} from '../../../../../server/utils/repositories/nutritionRepository'
import { generateStructuredAnalysis } from '../../../../../server/utils/gemini'
import { getUserNutritionSettings } from '../../../../../server/utils/nutrition/settings'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('getRouterParam', (event: any, name: string) => event.params?.[name])
vi.stubGlobal('readBody', async (event: any) => event.body)
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message || err.statusMessage)
  ;(error as any).statusCode = err.statusCode
  return error
})

vi.mock('../../../../../server/utils/auth-guard', () => ({
  requireAuth: vi.fn()
}))

vi.mock('../../../../../server/utils/repositories/nutritionRepository', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('../../../../../server/utils/repositories/nutritionRepository')
    >()
  return {
    ...actual,
    nutritionRepository: {
      getByDate: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateWithVersionCheck: vi.fn()
    }
  }
})

vi.mock('../../../../../server/utils/gemini', () => ({
  generateStructuredAnalysis: vi.fn()
}))

vi.mock('../../../../../server/utils/date', () => ({
  getUserTimezone: vi.fn(async () => 'UTC'),
  getStartOfLocalDateUTC: vi.fn((_: string, dateStr: string) => new Date(`${dateStr}T00:00:00Z`))
}))

vi.mock('../../../../../server/utils/nutrition/settings', () => ({
  getUserNutritionSettings: vi.fn()
}))

vi.mock('../../../../../server/utils/services/metabolicService', () => ({
  metabolicService: {
    calculateFuelingPlanForDate: vi.fn().mockResolvedValue({ plan: { windows: [] } })
  }
}))

vi.mock('../../../../../server/utils/services/nutritionPlanService', () => ({
  nutritionPlanService: { reconcileLoggedMealsForDate: vi.fn() }
}))

const getHandler = async () => {
  const mod = await import('../../../../../server/api/nutrition/[id]/log.post')
  return mod.default
}

describe('POST /api/nutrition/:id/log', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getUserNutritionSettings).mockResolvedValue({ mealPattern: [] } as any)
    vi.mocked(generateStructuredAnalysis).mockResolvedValue({
      items: [
        {
          name: 'Banana',
          calories: 90,
          protein: 1,
          carbs: 23,
          fat: 0,
          logged_at: '2026-07-21T12:00:00.000Z',
          mealType: 'lunch'
        }
      ]
    } as any)
  })

  it('merges the meal-array change and recalculated totals into a single version-checked write', async () => {
    const existing = {
      id: 'n1',
      date: new Date('2026-07-21T00:00:00Z'),
      updatedAt: new Date('2026-07-21T10:00:00Z'),
      breakfast: [],
      lunch: [],
      dinner: [],
      snacks: []
    }
    vi.mocked(nutritionRepository.getByDate).mockResolvedValue(existing as any)
    vi.mocked(nutritionRepository.updateWithVersionCheck).mockResolvedValue({
      ...existing,
      lunch: [{ id: 'x', name: 'Banana' }]
    } as any)

    const handler = await getHandler()
    await handler({
      params: { id: '2026-07-21' },
      body: { query: 'ate a banana', mealType: 'lunch' }
    } as any)

    expect(nutritionRepository.update).not.toHaveBeenCalled()
    expect(nutritionRepository.updateWithVersionCheck).toHaveBeenCalledTimes(1)
    const [id, updatedAt, data] = vi.mocked(nutritionRepository.updateWithVersionCheck).mock
      .calls[0]!
    expect(id).toBe('n1')
    expect(updatedAt).toBe(existing.updatedAt)
    expect(data.lunch).toHaveLength(1)
    expect(typeof data.calories).toBe('number')
  })

  it('returns a 409 conflict instead of silently dropping a concurrent log entry', async () => {
    const existing = {
      id: 'n1',
      date: new Date('2026-07-21T00:00:00Z'),
      updatedAt: new Date('2026-07-21T10:00:00Z'),
      breakfast: [],
      lunch: [],
      dinner: [],
      snacks: []
    }
    vi.mocked(nutritionRepository.getByDate).mockResolvedValue(existing as any)
    vi.mocked(nutritionRepository.updateWithVersionCheck).mockResolvedValue(
      CONCURRENT_UPDATE_CONFLICT
    )

    const handler = await getHandler()
    await expect(
      handler({
        params: { id: '2026-07-21' },
        body: { query: 'ate a banana', mealType: 'lunch' }
      } as any)
    ).rejects.toMatchObject({ statusCode: 409 })
  })
})
