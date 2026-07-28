import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { getServerSession } from '../../../../../server/utils/session'
import { metabolicService } from '../../../../../server/utils/services/metabolicService'
import { getUserTimezone, getUserLocalDate } from '../../../../../server/utils/date'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('defineRouteMeta', () => {})

let body: any = {}
vi.stubGlobal('readBody', async () => body)

vi.mock('../../../../../server/utils/session', () => ({
  getServerSession: vi.fn()
}))

vi.mock('../../../../../server/utils/services/metabolicService', () => ({
  metabolicService: { simulateMealImpact: vi.fn() }
}))

vi.mock('../../../../../server/utils/date', () => ({
  getUserTimezone: vi.fn(async () => 'UTC'),
  getUserLocalDate: vi.fn(() => new Date('2026-07-28T00:00:00.000Z'))
}))

describe('POST /api/nutrition/simulate-impact', () => {
  afterAll(() => {
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as any)
    vi.mocked(metabolicService.simulateMealImpact).mockResolvedValue([{ t: 0, points: 10 }] as any)
  })

  it('throws 401 if user is unauthenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null as any)
    const handler = (await import('../../../../../server/api/nutrition/simulate-impact.post'))
      .default
    await expect(handler({ context: {} } as any)).rejects.toMatchObject({
      statusCode: 401
    })
  })

  it('throws 400 when carbs is missing', async () => {
    body = {}
    const handler = (await import('../../../../../server/api/nutrition/simulate-impact.post'))
      .default
    await expect(handler({ context: {} } as any)).rejects.toMatchObject({
      statusCode: 400
    })
  })

  it('throws 400 when carbs is negative', async () => {
    body = { carbs: -10 }
    const handler = (await import('../../../../../server/api/nutrition/simulate-impact.post'))
      .default
    await expect(handler({ context: {} } as any)).rejects.toMatchObject({
      statusCode: 400,
      data: expect.arrayContaining([
        expect.objectContaining({ message: 'Carbs cannot be negative' })
      ])
    })
  })

  it('throws 400 when carbs exceeds 1000g', async () => {
    body = { carbs: 1001 }
    const handler = (await import('../../../../../server/api/nutrition/simulate-impact.post'))
      .default
    await expect(handler({ context: {} } as any)).rejects.toMatchObject({
      statusCode: 400,
      data: expect.arrayContaining([
        expect.objectContaining({ message: 'Carbs cannot exceed 1000g' })
      ])
    })
  })

  it('throws 400 when absorptionType is invalid', async () => {
    body = { carbs: 50, absorptionType: 'ULTRA_FAST' }
    const handler = (await import('../../../../../server/api/nutrition/simulate-impact.post'))
      .default
    await expect(handler({ context: {} } as any)).rejects.toMatchObject({
      statusCode: 400
    })
  })

  it('throws 400 when date format is invalid', async () => {
    body = { carbs: 50, date: '2026/07/28' }
    const handler = (await import('../../../../../server/api/nutrition/simulate-impact.post'))
      .default
    await expect(handler({ context: {} } as any)).rejects.toMatchObject({
      statusCode: 400
    })
  })

  it('throws 400 when date is a calendar-invalid date', async () => {
    body = { carbs: 50, date: '2026-02-30' }
    const handler = (await import('../../../../../server/api/nutrition/simulate-impact.post'))
      .default
    await expect(handler({ context: {} } as any)).rejects.toMatchObject({
      statusCode: 400,
      data: expect.arrayContaining([
        expect.objectContaining({ message: 'Invalid calendar date (YYYY-MM-DD)' })
      ])
    })
  })

  it('throws 400 when time is invalid ISO datetime', async () => {
    body = { carbs: 50, time: 'invalid-iso-string' }
    const handler = (await import('../../../../../server/api/nutrition/simulate-impact.post'))
      .default
    await expect(handler({ context: {} } as any)).rejects.toMatchObject({
      statusCode: 400
    })
  })

  it('simulates impact successfully with valid default payload', async () => {
    body = { carbs: 60 }
    const handler = (await import('../../../../../server/api/nutrition/simulate-impact.post'))
      .default
    const response: any = await handler({ context: {} } as any)

    expect(response.success).toBe(true)
    expect(response.points).toEqual([{ t: 0, points: 10 }])
    expect(metabolicService.simulateMealImpact).toHaveBeenCalledWith(
      'user-1',
      expect.any(Date),
      expect.objectContaining({
        totalCarbs: 60,
        totalKcal: 240
      })
    )
  })

  it('simulates impact successfully with full valid payload', async () => {
    body = {
      carbs: 75,
      absorptionType: 'RAPID',
      date: '2026-07-28',
      time: '2026-07-28T14:30:00.000Z'
    }
    const handler = (await import('../../../../../server/api/nutrition/simulate-impact.post'))
      .default
    const response: any = await handler({ context: {} } as any)

    expect(response.success).toBe(true)
    expect(response.points).toEqual([{ t: 0, points: 10 }])
    expect(metabolicService.simulateMealImpact).toHaveBeenCalledWith(
      'user-1',
      expect.any(Date),
      expect.objectContaining({
        totalCarbs: 75,
        totalKcal: 300
      })
    )
  })
})
