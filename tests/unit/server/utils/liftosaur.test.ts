import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchAllLiftosaurHistory,
  fetchLiftosaurPrograms,
  parseLiftosaurMeasurementValue
} from '../../../../server/utils/liftosaur'
import type { LiftosaurApiError } from '../../../../server/utils/liftosaur'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Liftosaur API client', () => {
  it('uses bearer authentication', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { programs: [] } }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    await fetchLiftosaurPrograms('lftsk_test')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.liftosaur.com/api/v1/programs',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer lftsk_test' })
      })
    )
  })

  it('follows history cursors', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { records: [{ id: 2, text: 'second' }], hasMore: true, nextCursor: 2 }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { records: [{ id: 1, text: 'first' }], hasMore: false } }),
          { status: 200 }
        )
      )
    vi.stubGlobal('fetch', fetchMock)

    const records = await fetchAllLiftosaurHistory('lftsk_test', {
      startDate: '2026-01-01',
      endDate: '2026-03-01'
    })

    expect(records.map((record) => record.id)).toEqual([2, 1])
    expect(String(fetchMock.mock.calls[1]![0])).toContain('cursor=2')
  })

  it('returns a non-retryable authentication error for an invalid key', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ error: { code: 'unauthorized', message: 'Invalid API key' } }),
            { status: 401 }
          )
        )
    )

    await expect(fetchLiftosaurPrograms('lftsk_bad')).rejects.toMatchObject<
      Partial<LiftosaurApiError>
    >({ statusCode: 401, code: 'unauthorized', retryable: false })
  })
})

describe('parseLiftosaurMeasurementValue', () => {
  it('normalizes pounds to kilograms', () => {
    expect(parseLiftosaurMeasurementValue('180lb')).toEqual({ value: 81.6466266, unit: 'kg' })
  })

  it('parses kilograms and percentages', () => {
    expect(parseLiftosaurMeasurementValue('82kg')).toEqual({ value: 82, unit: 'kg' })
    expect(parseLiftosaurMeasurementValue('18%')).toEqual({ value: 18, unit: 'pct' })
  })

  it('rejects values without explicit units', () => {
    expect(parseLiftosaurMeasurementValue('180')).toBeNull()
  })
})
