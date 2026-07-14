import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('getQuery', (event: any) => event.query || {})
vi.stubGlobal('getValidatedRouterParams', async (_event: any, parser: any) =>
  parser({ id: 'athlete-1' })
)
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message)
  ;(error as any).statusCode = err.statusCode
  return error
})

vi.mock('../../../../../../server/utils/coaching-auth', () => ({
  requireCoachAccessToAthlete: vi.fn()
}))

vi.mock('../../../../../../server/utils/calendar-data', () => ({
  getCalendarDataForUser: vi.fn()
}))

describe('coaching athlete calendar.get', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  async function loadHandler() {
    const { default: handler } =
      await import('../../../../../../server/api/coaching/athletes/[id]/calendar.get')
    return handler
  }

  it('rejects inverted date ranges', async () => {
    const handler = await loadHandler()
    const { getCalendarDataForUser } = await import('../../../../../../server/utils/calendar-data')

    await expect(
      handler({
        query: {
          startDate: '2026-07-10T00:00:00.000Z',
          endDate: '2026-07-01T00:00:00.000Z'
        }
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'startDate must be on or before endDate'
    })

    expect(getCalendarDataForUser).not.toHaveBeenCalled()
  })

  it('rejects ranges larger than the configured cap', async () => {
    const handler = await loadHandler()

    await expect(
      handler({
        query: {
          startDate: '2020-01-01T00:00:00.000Z',
          endDate: '2030-01-01T00:00:00.000Z'
        }
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Date range cannot exceed 90 days'
    })
  })

  it('allows a normal week request', async () => {
    const handler = await loadHandler()
    const { getCalendarDataForUser } = await import('../../../../../../server/utils/calendar-data')
    vi.mocked(getCalendarDataForUser).mockResolvedValue({ days: [] } as any)

    await handler({
      query: {
        startDate: '2026-07-07T00:00:00.000Z',
        endDate: '2026-07-13T00:00:00.000Z'
      }
    })

    expect(getCalendarDataForUser).toHaveBeenCalled()
  })
})
