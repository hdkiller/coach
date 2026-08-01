import { beforeEach, describe, expect, it, vi } from 'vitest'

import { prisma } from '../../../../../server/utils/db'
import { wellnessRepository } from '../../../../../server/utils/repositories/wellnessRepository'
import { requireAuth } from '../../../../../server/utils/auth-guard'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('defineRouteMeta', () => {})
vi.stubGlobal('getQuery', (event: any) => event.query || {})
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message)
  ;(error as any).statusCode = err.statusCode
  return error
})

vi.mock('../../../../../server/utils/auth-guard', () => ({
  requireAuth: vi.fn()
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    llmUsage: {
      findMany: vi.fn()
    }
  }
}))

vi.mock('../../../../../server/utils/repositories/wellnessRepository', () => ({
  wellnessRepository: {
    getForUser: vi.fn()
  }
}))

const getHandler = async () => {
  const mod = await import('../../../../../server/api/wellness/index.get')
  return mod.default
}

describe('GET /api/wellness', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(wellnessRepository.getForUser).mockResolvedValue([
      { id: 'w-1', date: new Date('2026-07-01T00:00:00.000Z') }
    ] as any)
    vi.mocked(prisma.llmUsage.findMany).mockResolvedValue([] as any)
  })

  it('defaults to the last 90 days when startDate/endDate are omitted', async () => {
    const handler = await getHandler()
    const before = Date.now()

    await handler({ query: {} } as any)

    const after = Date.now()
    expect(wellnessRepository.getForUser).toHaveBeenCalledTimes(1)
    const [, options] = vi.mocked(wellnessRepository.getForUser).mock.calls[0]
    expect(options.orderBy).toEqual({ date: 'desc' })
    expect(options.limit).toBeUndefined()

    const spanDays =
      (options.endDate!.getTime() - options.startDate!.getTime()) / (24 * 60 * 60 * 1000)
    expect(spanDays).toBe(90)
    expect(options.endDate!.getTime()).toBeGreaterThanOrEqual(before - 1000)
    expect(options.endDate!.getTime()).toBeLessThanOrEqual(after + 1000)
  })

  it('forwards custom startDate and endDate to the repository', async () => {
    const handler = await getHandler()

    const result = await handler({
      query: {
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-07-29T00:00:00.000Z'
      }
    } as any)

    expect(wellnessRepository.getForUser).toHaveBeenCalledWith('user-1', {
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-07-29T00:00:00.000Z'),
      orderBy: { date: 'desc' }
    })
    expect(result).toEqual([
      expect.objectContaining({
        id: 'w-1',
        llmUsageId: undefined,
        feedback: undefined,
        feedbackText: undefined
      })
    ])
  })

  it('accepts a YTD-length range without truncating to 90 days', async () => {
    const handler = await getHandler()

    await handler({
      query: {
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-07-29T12:00:00.000Z'
      }
    } as any)

    const [, options] = vi.mocked(wellnessRepository.getForUser).mock.calls[0]
    const spanDays =
      (options.endDate!.getTime() - options.startDate!.getTime()) / (24 * 60 * 60 * 1000)
    expect(spanDays).toBeGreaterThan(90)
    expect(options.limit).toBeUndefined()
  })

  it('rejects invalid dates', async () => {
    const handler = await getHandler()

    await expect(
      handler({
        query: {
          startDate: 'not-a-date',
          endDate: '2026-07-29'
        }
      } as any)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Invalid startDate'
    })

    expect(wellnessRepository.getForUser).not.toHaveBeenCalled()
  })

  it('rejects inverted ranges', async () => {
    const handler = await getHandler()

    await expect(
      handler({
        query: {
          startDate: '2026-07-29',
          endDate: '2026-01-01'
        }
      } as any)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'startDate must be on or before endDate'
    })
  })

  it('rejects when only one bound is provided', async () => {
    const handler = await getHandler()

    await expect(
      handler({
        query: { startDate: '2026-01-01' }
      } as any)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Both startDate and endDate are required when specifying a custom range'
    })
  })

  it('rejects ranges beyond the max span', async () => {
    const handler = await getHandler()

    await expect(
      handler({
        query: {
          startDate: '2010-01-01T00:00:00.000Z',
          endDate: '2026-07-29T00:00:00.000Z'
        }
      } as any)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Date range cannot exceed 3660 days'
    })
  })

  it('attaches llm usage feedback when present', async () => {
    const handler = await getHandler()
    vi.mocked(prisma.llmUsage.findMany).mockResolvedValue([
      {
        id: 'usage-1',
        entityId: 'w-1',
        feedback: 'up',
        feedbackText: 'helpful'
      }
    ] as any)

    const result = await handler({
      query: {
        startDate: '2026-01-01',
        endDate: '2026-01-31'
      }
    } as any)

    expect(result).toEqual([
      expect.objectContaining({
        id: 'w-1',
        llmUsageId: 'usage-1',
        feedback: 'up',
        feedbackText: 'helpful'
      })
    ])
  })
})
