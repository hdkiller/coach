import { describe, it, expect, beforeEach, vi } from 'vitest'

import { fetchAllWahooWorkouts } from '../../../trigger/ingest-wahoo'
import { fetchWahooWorkouts } from '../../../server/utils/wahoo'

vi.mock('@trigger.dev/sdk/v3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@trigger.dev/sdk/v3')>()
  return {
    ...actual,
    logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn() }
  }
})

vi.mock('../../../server/utils/wahoo', () => ({
  fetchWahooWorkouts: vi.fn(),
  normalizeWahooWorkout: vi.fn()
}))

function makeWorkout(id: number) {
  return { id, starts: '2026-01-01T00:00:00Z', minutes: 30 } as any
}

describe('fetchAllWahooWorkouts pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('follows pagination across multiple pages until a short page is returned', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => makeWorkout(i))
    const page2 = Array.from({ length: 100 }, (_, i) => makeWorkout(100 + i))
    const page3 = Array.from({ length: 37 }, (_, i) => makeWorkout(200 + i))

    vi.mocked(fetchWahooWorkouts)
      .mockResolvedValueOnce({ workouts: page1, total: 237 })
      .mockResolvedValueOnce({ workouts: page2, total: 237 })
      .mockResolvedValueOnce({ workouts: page3, total: 237 })

    const result = await fetchAllWahooWorkouts({} as any)

    expect(result).toHaveLength(237)
    expect(fetchWahooWorkouts).toHaveBeenCalledTimes(3)
    expect(fetchWahooWorkouts).toHaveBeenNthCalledWith(1, {}, 1, 100)
    expect(fetchWahooWorkouts).toHaveBeenNthCalledWith(2, {}, 2, 100)
    expect(fetchWahooWorkouts).toHaveBeenNthCalledWith(3, {}, 3, 100)
  })

  it('stops as soon as the reported total has been collected', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => makeWorkout(i))
    const page2 = Array.from({ length: 100 }, (_, i) => makeWorkout(100 + i))

    vi.mocked(fetchWahooWorkouts)
      .mockResolvedValueOnce({ workouts: page1, total: 200 })
      .mockResolvedValueOnce({ workouts: page2, total: 200 })

    const result = await fetchAllWahooWorkouts({} as any)

    expect(result).toHaveLength(200)
    expect(fetchWahooWorkouts).toHaveBeenCalledTimes(2)
  })

  it('stops immediately when the first page is empty', async () => {
    vi.mocked(fetchWahooWorkouts).mockResolvedValueOnce({ workouts: [], total: 0 })

    const result = await fetchAllWahooWorkouts({} as any)

    expect(result).toHaveLength(0)
    expect(fetchWahooWorkouts).toHaveBeenCalledTimes(1)
  })

  it('honors the safety cap and does not loop forever if the API misbehaves', async () => {
    // Simulate a misbehaving API that always returns a full page and never
    // lets `total` be reached, so the only thing that can stop the loop is
    // the hard cap on page count.
    vi.mocked(fetchWahooWorkouts).mockImplementation(async (_integration, page = 1) => ({
      workouts: Array.from({ length: 100 }, (_, i) => makeWorkout((page as number) * 1000 + i)),
      total: Number.MAX_SAFE_INTEGER
    }))

    vi.useFakeTimers()
    try {
      const resultPromise = fetchAllWahooWorkouts({} as any)
      await vi.runAllTimersAsync()
      const result = await resultPromise

      // 50 pages * 100 per page, per the safety cap.
      expect(result).toHaveLength(5000)
      expect(fetchWahooWorkouts).toHaveBeenCalledTimes(50)
    } finally {
      vi.useRealTimers()
    }
  })
})
