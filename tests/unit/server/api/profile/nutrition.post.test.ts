import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { requireAuth } from '../../../../../server/utils/auth-guard'
import { nutritionSettingsRepository } from '../../../../../server/utils/repositories/nutritionSettingsRepository'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('defineRouteMeta', () => {})
vi.stubGlobal('createError', (error: any) => error)

let body: any = {}
vi.stubGlobal('readBody', async () => body)

vi.mock('../../../../../server/utils/auth-guard', () => ({
  requireAuth: vi.fn()
}))

vi.mock('../../../../../server/utils/repositories/nutritionSettingsRepository', () => ({
  nutritionSettingsRepository: { getByUserId: vi.fn(), upsert: vi.fn() }
}))

vi.mock('../../../../../server/utils/services/metabolicService', () => ({
  metabolicService: { calculateFuelingPlanForDate: vi.fn() }
}))

vi.mock('../../../../../server/utils/nutrition/feature', () => ({
  isNutritionTrackingEnabled: vi.fn(async () => false)
}))

vi.mock('../../../../../server/utils/date', () => ({
  getUserLocalDate: vi.fn(() => new Date('2026-07-21T00:00:00.000Z')),
  getUserTimezone: vi.fn(async () => 'UTC')
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: { user: { update: vi.fn() } }
}))

const VALID = { currentCarbMax: 60, ultimateCarbGoal: 90 }

async function post(payload: Record<string, unknown>) {
  body = payload
  // Imported lazily: the module calls defineRouteMeta at load time, after the globals are stubbed.
  const handler = (await import('../../../../../server/api/profile/nutrition.post')).default
  return handler({} as any)
}

async function postExpectingError(payload: Record<string, unknown>) {
  try {
    await post(payload)
  } catch (err: any) {
    return err
  }
  throw new Error('expected the request to be rejected')
}

describe('POST /api/profile/nutrition relational validation', () => {
  // Most of this suite stubs globals without restoring them; do not add to the pile.
  afterAll(() => {
    vi.unstubAllGlobals()
  })
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(nutritionSettingsRepository.getByUserId).mockResolvedValue(null as any)
    vi.mocked(nutritionSettingsRepository.upsert).mockResolvedValue({ id: 'settings-1' } as any)
  })

  it('saves a coherent payload', async () => {
    const response = await post({
      ...VALID,
      mealPattern: [
        { name: 'Breakfast', time: '07:00' },
        { name: 'Lunch', time: '12:00' }
      ]
    })

    expect(nutritionSettingsRepository.upsert).toHaveBeenCalled()
    expect(response).toEqual({ settings: { id: 'settings-1' } })
  })

  it('rejects duplicate meal-slot names', async () => {
    const err = await postExpectingError({
      ...VALID,
      mealPattern: [
        { name: 'Snack', time: '10:00' },
        { name: 'Snack', time: '15:00' }
      ]
    })

    expect(err.statusCode).toBe(400)
    expect(err.data[0].path).toEqual(['mealPattern', 1, 'name'])
    expect(nutritionSettingsRepository.upsert).not.toHaveBeenCalled()
  })

  it('rejects a malformed meal time instead of silently dropping the slot', async () => {
    const err = await postExpectingError({
      ...VALID,
      mealPattern: [{ name: 'Lunch', time: '25:00' }]
    })

    expect(err.statusCode).toBe(400)
    expect(err.data[0].path).toEqual(['mealPattern', 0, 'time'])
  })

  it('rejects inverted fuel-state triggers', async () => {
    const err = await postExpectingError({
      ...VALID,
      fuelState1Trigger: 0.9,
      fuelState2Trigger: 0.5
    })

    expect(err.statusCode).toBe(400)
    expect(err.data[0].path).toEqual(['fuelState2Trigger'])
  })

  it('rejects a partial update that inverts against a stored value', async () => {
    // The request only moves one half of the pair; the other half is never in the body, so the
    // check has to read it from what is already saved. The stored trigger is deliberately not the
    // default - against the default 0.85 this payload looks fine, and would be accepted.
    vi.mocked(nutritionSettingsRepository.getByUserId).mockResolvedValue({
      fuelState1Trigger: 0.6,
      fuelState2Trigger: 0.75
    } as any)

    const err = await postExpectingError({ ...VALID, fuelState1Trigger: 0.8 })

    expect(err.statusCode).toBe(400)
    expect(err.data[0].path).toEqual(['fuelState2Trigger'])
    expect(nutritionSettingsRepository.upsert).not.toHaveBeenCalled()
  })

  it('accepts a partial update that is coherent with the stored value', async () => {
    // The mirror image: judged against the default 0.85 this would be wrongly rejected.
    vi.mocked(nutritionSettingsRepository.getByUserId).mockResolvedValue({
      fuelState1Trigger: 0.7,
      fuelState2Trigger: 0.95
    } as any)

    await post({ ...VALID, fuelState1Trigger: 0.9 })

    expect(nutritionSettingsRepository.upsert).toHaveBeenCalled()
  })

  it('surfaces a readable message the settings form can show', async () => {
    // NutritionSettings.vue renders err.data.message, so the reason has to be prose.
    const err = await postExpectingError({ ...VALID, fuelState3Max: 1 })

    expect(err.message).toMatch(/Hard day carb maximum/)
  })
})
