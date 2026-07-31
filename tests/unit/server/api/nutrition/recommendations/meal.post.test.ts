import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { requireAuth } from '../../../../../../server/utils/auth-guard'
import { dispatchTask } from '../../../../../../server/utils/task-dispatcher'
import { prisma } from '../../../../../../server/utils/db'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (error: any) => {
  const err = new Error(error.message) as any
  err.statusCode = error.statusCode
  return err
})

let body: any = {}
vi.stubGlobal('readBody', async () => body)

vi.mock('../../../../../../server/utils/auth-guard', () => ({ requireAuth: vi.fn() }))

vi.mock('../../../../../../server/utils/task-dispatcher', () => ({
  dispatchTask: vi.fn()
}))

const { findFirst, create, update } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn()
}))

vi.mock('../../../../../../server/utils/db', () => ({
  prisma: {
    nutritionRecommendation: { findFirst, create, update }
  }
}))

async function post(payload: Record<string, unknown>) {
  body = payload
  const handler = (await import('../../../../../../server/api/nutrition/recommendations/meal.post'))
    .default
  return handler({} as any)
}

describe('POST /api/nutrition/recommendations/meal', () => {
  afterAll(() => {
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ id: 'user-1' } as any)
    findFirst.mockResolvedValue(null)
    create.mockResolvedValue({ id: 'rec-1' })
    update.mockResolvedValue({})
  })

  it('marks the recommendation FAILED instead of leaving it stuck in PROCESSING when enqueue throws', async () => {
    vi.mocked(dispatchTask).mockRejectedValue(new Error('Trigger service unavailable'))

    await expect(
      post({
        date: '2026-07-31',
        windowType: 'PRE_WORKOUT',
        targetCarbs: 50,
        targetProtein: 20,
        targetKcal: 400
      })
    ).rejects.toMatchObject({ statusCode: 500 })

    expect(update).toHaveBeenCalledWith({
      where: { id: 'rec-1' },
      data: {
        status: 'FAILED',
        contextJson: {
          requestedTargets: { carbs: 50, protein: 20, kcal: 400 },
          error: 'ENQUEUE_FAILED',
          errorMessage: 'Trigger service unavailable'
        }
      }
    })
  })

  it('stores the runId on the recommendation when enqueue succeeds', async () => {
    vi.mocked(dispatchTask).mockResolvedValue({ id: 'run-123' })

    const result: any = await post({
      date: '2026-07-31',
      windowType: 'PRE_WORKOUT',
      targetCarbs: 50,
      targetProtein: 20,
      targetKcal: 400
    })

    expect(result.success).toBe(true)
    expect(result.runId).toBe('run-123')
    expect(update).toHaveBeenCalledWith({
      where: { id: 'rec-1' },
      data: { runId: 'run-123' }
    })
  })
})
