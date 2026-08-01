import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requireAuth } from '../../../../../../server/utils/auth-guard'
import { prisma } from '../../../../../../server/utils/db'
import { trainingPlanRepository } from '../../../../../../server/utils/repositories/trainingPlanRepository'
import { trainingBlockRepository } from '../../../../../../server/utils/repositories/trainingBlockRepository'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('getRouterParam', (event: any, name: string) => event.params?.[name])
vi.stubGlobal('readBody', async (event: any) => event.body)
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message || err.statusMessage)
  ;(error as any).statusCode = err.statusCode
  return error
})

vi.mock('../../../../../../server/utils/auth-guard', () => ({
  requireAuth: vi.fn()
}))

vi.mock('../../../../../../server/utils/db', () => ({
  prisma: {
    $transaction: vi.fn(),
    $executeRawUnsafe: vi.fn()
  }
}))

vi.mock('../../../../../../server/utils/repositories/trainingPlanRepository', () => ({
  trainingPlanRepository: {
    getById: vi.fn()
  }
}))

vi.mock('../../../../../../server/utils/repositories/trainingBlockRepository', () => ({
  trainingBlockRepository: {
    update: vi.fn(),
    updateMany: vi.fn(),
    list: vi.fn()
  }
}))

const getHandler = async () => {
  const mod = await import('../../../../../../server/api/plans/[id]/blocks/reorder.put')
  return mod.default
}

describe('PUT /api/plans/:id/blocks/reorder IDOR', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ id: 'attacker-1' } as any)
    vi.mocked(trainingPlanRepository.getById).mockResolvedValue({
      id: 'plan-attacker',
      userId: 'attacker-1',
      startDate: new Date('2026-01-05T00:00:00.000Z'),
      blocks: [
        {
          id: 'block-attacker-a',
          order: 0,
          startDate: new Date('2026-01-05T00:00:00.000Z'),
          durationWeeks: 2,
          weeks: []
        },
        {
          id: 'block-attacker-b',
          order: 1,
          startDate: new Date('2026-01-19T00:00:00.000Z'),
          durationWeeks: 2,
          weeks: []
        }
      ]
    } as any)
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(prisma))
    vi.mocked(trainingBlockRepository.list).mockResolvedValue([])
  })

  it('rejects a foreign block id and never mutates it', async () => {
    const handler = await getHandler()

    await expect(
      handler({
        params: { id: 'plan-attacker' },
        body: {
          blocks: [
            { id: 'block-attacker-a', order: 0 },
            { id: 'block-victim', order: 1 }
          ]
        }
      } as any)
    ).rejects.toMatchObject({ statusCode: 404, message: 'Block not found' })

    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(trainingBlockRepository.updateMany).not.toHaveBeenCalled()
    expect(trainingBlockRepository.update).not.toHaveBeenCalled()
  })

  it('reorders only blocks that belong to the ownership-verified plan', async () => {
    vi.mocked(trainingBlockRepository.list).mockResolvedValue([
      {
        id: 'block-attacker-b',
        order: 0,
        startDate: new Date('2026-01-19T00:00:00.000Z'),
        durationWeeks: 2,
        weeks: []
      },
      {
        id: 'block-attacker-a',
        order: 1,
        startDate: new Date('2026-01-05T00:00:00.000Z'),
        durationWeeks: 2,
        weeks: []
      }
    ] as any)

    const handler = await getHandler()

    const result = await handler({
      params: { id: 'plan-attacker' },
      body: {
        blocks: [
          { id: 'block-attacker-b', order: 0 },
          { id: 'block-attacker-a', order: 1 }
        ]
      }
    } as any)

    expect(result).toEqual({ success: true })
    expect(trainingBlockRepository.updateMany).toHaveBeenCalledWith(
      { id: 'block-attacker-b', trainingPlanId: 'plan-attacker' },
      { order: 0 },
      prisma
    )
    expect(trainingBlockRepository.updateMany).toHaveBeenCalledWith(
      { id: 'block-attacker-a', trainingPlanId: 'plan-attacker' },
      { order: 1 },
      prisma
    )
  })
})
