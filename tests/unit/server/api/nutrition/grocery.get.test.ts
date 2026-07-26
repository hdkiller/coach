import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { requireAuth } from '../../../../../server/utils/auth-guard'
import { getEffectiveUserId } from '../../../../../server/utils/coaching'
import { nutritionPlanService } from '../../../../../server/utils/services/nutritionPlanService'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (error: any) => {
  const err = new Error(error.message) as any
  err.statusCode = error.statusCode
  return err
})

let query: any = {}
vi.stubGlobal('getQuery', () => query)

vi.mock('../../../../../server/utils/auth-guard', () => ({ requireAuth: vi.fn() }))
vi.mock('../../../../../server/utils/coaching', () => ({ getEffectiveUserId: vi.fn() }))
vi.mock('../../../../../server/utils/services/nutritionPlanService', () => ({
  nutritionPlanService: { getGroceryList: vi.fn() }
}))

async function get(params: Record<string, string>) {
  query = params
  const handler = (await import('../../../../../server/api/nutrition/grocery.get')).default
  return handler({} as any)
}

describe('GET /api/nutrition/grocery', () => {
  // Most of this suite stubs globals without restoring them; do not add to the pile.
  afterAll(() => {
    vi.unstubAllGlobals()
  })
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getEffectiveUserId).mockResolvedValue('user-1')
    vi.mocked(nutritionPlanService.getGroceryList).mockResolvedValue({
      items: [],
      totals: { ingredients: 0, meals: 0 }
    } as any)
  })

  it('accepts a valid range', async () => {
    const result: any = await get({ start: '2026-07-20', end: '2026-07-22' })

    expect(result.success).toBe(true)
    const [, start, end] = vi.mocked(nutritionPlanService.getGroceryList).mock.calls[0] as any
    expect(start.toISOString()).toBe('2026-07-20T00:00:00.000Z')
    expect(end.toISOString()).toBe('2026-07-22T23:59:59.999Z')
  })

  it('rejects a malformed end date instead of passing an Invalid Date to the query', async () => {
    // `start` was validated and `end` was not, so garbage reached getGroceryList as Invalid Date.
    await expect(get({ start: '2026-07-20', end: 'not-a-date' })).rejects.toMatchObject({
      statusCode: 400
    })
    expect(nutritionPlanService.getGroceryList).not.toHaveBeenCalled()
  })

  it('still rejects a malformed start date', async () => {
    await expect(get({ start: 'nonsense' })).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rejects an end that precedes the start', async () => {
    await expect(get({ start: '2026-07-22', end: '2026-07-20' })).rejects.toMatchObject({
      statusCode: 400
    })
  })

  it('defaults to a 48 hour window when no end is given', async () => {
    await get({ start: '2026-07-20' })

    const [, , end] = vi.mocked(nutritionPlanService.getGroceryList).mock.calls[0] as any
    expect(end.toISOString()).toBe('2026-07-21T23:59:59.999Z')
  })
})
