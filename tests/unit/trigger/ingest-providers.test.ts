import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ingestStravaTask } from '../../../trigger/ingest-strava'

import { runIngestStrava } from '../../../server/utils/services/stravaService'

vi.mock('@trigger.dev/sdk/v3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@trigger.dev/sdk/v3')>()
  return {
    ...actual,
    logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn() }
  }
})

vi.mock('../../../server/utils/services/stravaService', () => ({
  runIngestStrava: vi.fn()
}))

describe('Provider Ingestion Tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('executes runIngestStrava service method', async () => {
    const mockResult = {
      success: true,
      counts: { workouts: 3 },
      userId: 'user-strava-1',
      startDate: '2026-03-01',
      endDate: '2026-03-10'
    }

    vi.mocked(runIngestStrava).mockResolvedValue(mockResult as any)

    const result = await runIngestStrava({
      userId: 'user-strava-1',
      startDate: '2026-03-01',
      endDate: '2026-03-10'
    })

    expect(runIngestStrava).toHaveBeenCalledWith({
      userId: 'user-strava-1',
      startDate: '2026-03-01',
      endDate: '2026-03-10'
    })
    expect(result).toEqual(mockResult)
  })
})
