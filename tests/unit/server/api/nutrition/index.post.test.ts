import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { requireAuth } from '../../../../../server/utils/auth-guard'
import { nutritionRepository } from '../../../../../server/utils/repositories/nutritionRepository'
import { getUserNutritionSettings } from '../../../../../server/utils/nutrition/settings'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('defineRouteMeta', () => {})
vi.stubGlobal('createError', (error: any) => error)

let body: any = {}
vi.stubGlobal('readBody', async () => body)

// Auto-imported in the Nuxt server runtime. The tests run in UTC, so UTC parts are the local parts.
vi.stubGlobal('formatUserTime', (date: Date) => `${date.getUTCHours()}:${date.getUTCMinutes()}`)

vi.mock('../../../../../server/utils/auth-guard', () => ({
  requireAuth: vi.fn()
}))

vi.mock('../../../../../server/utils/repositories/nutritionRepository', () => ({
  nutritionRepository: { getByDate: vi.fn(), upsert: vi.fn() }
}))

vi.mock('../../../../../server/utils/nutrition/settings', () => ({
  getUserNutritionSettings: vi.fn()
}))

vi.mock('../../../../../server/utils/services/metabolicService', () => ({
  metabolicService: { calculateFuelingPlanForDate: vi.fn() }
}))

vi.mock('../../../../../server/utils/services/nutritionPlanService', () => ({
  nutritionPlanService: { reconcileLoggedMealsForDate: vi.fn() }
}))

vi.mock('../../../../../server/utils/date', () => ({
  getUserTimezone: vi.fn(async () => 'UTC'),
  getStartOfLocalDateUTC: vi.fn(),
  formatUserTime: vi.fn(() => '12:00')
}))

/** Buckets the endpoint assigned each item to, read off the upsert payload. */
async function bucketsFor(mealPattern: any[], items: any[]) {
  vi.mocked(getUserNutritionSettings).mockResolvedValue({ mealPattern } as any)
  body = { date: '2026-07-21', items }

  const handler = (await import('../../../../../server/api/nutrition/index.post')).default
  await handler({ context: {} } as any)

  const payload = vi.mocked(nutritionRepository.upsert).mock.calls[0]?.[3] as any
  const result: Record<string, string[]> = {}
  for (const bucket of ['breakfast', 'lunch', 'dinner', 'snacks']) {
    result[bucket] = (payload?.[bucket] || []).map((item: any) => item.name)
  }
  return result
}

const item = (name: string, hhmm: string) => ({
  name,
  calories: 100,
  carbs: 20,
  logged_at: `2026-07-21T${hhmm}:00.000Z`
})

describe('POST /api/nutrition meal bucketing', () => {
  // Most of this suite stubs globals without restoring them; do not add to the pile.
  afterAll(() => {
    vi.unstubAllGlobals()
  })
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(nutritionRepository.getByDate).mockResolvedValue(null as any)
    vi.mocked(nutritionRepository.upsert).mockResolvedValue({ record: { id: 'n1' } } as any)
  })

  it('buckets by the times an English meal pattern configures', async () => {
    const buckets = await bucketsFor(
      [
        { name: 'Breakfast', time: '06:00' },
        { name: 'Lunch', time: '11:00' },
        { name: 'Dinner', time: '21:00' },
        { name: 'Snack', time: '16:00' }
      ],
      [item('Porridge', '06:10'), item('Steak', '20:50')]
    )

    expect(buckets.breakfast).toEqual(['Porridge'])
    expect(buckets.dinner).toEqual(['Steak'])
  })

  it('uses the configured times for a pattern written in another language', async () => {
    // The literal 'breakfast' / 'lunch' name lookup this replaced matched nothing here and fell
    // back to a fixed 07:00 / 12:00 / 18:00 / 15:00. The times below are chosen so that those
    // defaults produce a *different* bucket, not merely a different boundary: the 10:15 item lands
    // in lunch and the 17:00 item in dinner once the athlete's own schedule is ignored.
    const buckets = await bucketsFor(
      [
        { name: 'Reggeli', time: '10:00' },
        { name: 'Ebéd', time: '14:00' },
        { name: 'Vacsora', time: '22:00' },
        { name: 'Uzsonna', time: '18:00' }
      ],
      [item('Zabkása', '10:15'), item('Pogácsa', '17:00')]
    )

    expect(buckets.breakfast).toEqual(['Zabkása'])
    expect(buckets.snacks).toEqual(['Pogácsa'])
  })

  it('still honours an explicit meal field over the time', async () => {
    const buckets = await bucketsFor(
      [{ name: 'Breakfast', time: '06:00' }],
      [{ ...item('Late snack', '06:05'), meal: 'DINNER' }]
    )

    expect(buckets.dinner).toEqual(['Late snack'])
    expect(buckets.breakfast).toEqual([])
  })
})
