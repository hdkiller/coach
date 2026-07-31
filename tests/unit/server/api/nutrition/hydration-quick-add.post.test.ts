import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requireAuth } from '../../../../../server/utils/auth-guard'
import {
  CONCURRENT_UPDATE_CONFLICT,
  nutritionRepository
} from '../../../../../server/utils/repositories/nutritionRepository'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('defineRouteMeta', () => {})
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

const getHandler = async () => {
  const mod = await import('../../../../../server/api/nutrition/hydration-quick-add.post')
  return mod.default
}

describe('POST /api/nutrition/hydration-quick-add', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ id: 'user-1' } as any)
  })

  it('merges the new snack and the recalculated waterMl into a single version-checked write', async () => {
    const existing = {
      id: 'n1',
      updatedAt: new Date('2026-07-21T10:00:00Z'),
      waterMl: 200,
      snacks: [{ id: 'existing', name: 'Water', water_ml: 200, calories: 0 }]
    }
    vi.mocked(nutritionRepository.getByDate).mockResolvedValue(existing as any)
    vi.mocked(nutritionRepository.updateWithVersionCheck).mockResolvedValue({
      id: 'n1',
      waterMl: 500
    } as any)

    const handler = await getHandler()
    const result = await handler({
      context: {},
      body: { date: '2026-07-21', volumeMl: 300 }
    } as any)

    expect(nutritionRepository.update).not.toHaveBeenCalled()
    expect(nutritionRepository.updateWithVersionCheck).toHaveBeenCalledTimes(1)
    const [id, updatedAt, data] = vi.mocked(nutritionRepository.updateWithVersionCheck).mock
      .calls[0]!
    expect(id).toBe('n1')
    expect(updatedAt).toBe(existing.updatedAt)
    expect(data.snacks).toHaveLength(2)
    expect((result as any).totalWaterMl).toBe(500)
  })

  it('returns a 409 conflict instead of silently dropping a concurrent quick-add', async () => {
    const existing = {
      id: 'n1',
      updatedAt: new Date('2026-07-21T10:00:00Z'),
      waterMl: 200,
      snacks: []
    }
    vi.mocked(nutritionRepository.getByDate).mockResolvedValue(existing as any)
    vi.mocked(nutritionRepository.updateWithVersionCheck).mockResolvedValue(
      CONCURRENT_UPDATE_CONFLICT
    )

    const handler = await getHandler()
    await expect(
      handler({
        context: {},
        body: { date: '2026-07-21', volumeMl: 300 }
      } as any)
    ).rejects.toMatchObject({ statusCode: 409 })
  })
})
