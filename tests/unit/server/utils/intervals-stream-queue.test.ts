import { beforeEach, describe, expect, it, vi } from 'vitest'
import { streamsQueue } from '../../../../server/utils/queue'
import {
  enqueueIntervalsStreamSync,
  intervalsStreamJobId
} from '../../../../server/utils/intervals-stream-queue'

vi.mock('../../../../server/utils/queue', () => ({
  streamsQueue: {
    getJob: vi.fn(),
    add: vi.fn()
  }
}))

describe('intervals stream queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds a stable dedupe job id per activity', () => {
    expect(intervalsStreamJobId('i123')).toBe('intervals-stream:i123')
  })

  it('enqueues stream sync jobs with dedupe job id', async () => {
    vi.mocked(streamsQueue.getJob).mockResolvedValue(null)

    await enqueueIntervalsStreamSync({
      userId: 'user-1',
      workoutId: 'workout-1',
      activityId: 'i123'
    })

    expect(streamsQueue.add).toHaveBeenCalledWith(
      'intervals-stream-sync',
      {
        provider: 'intervals-stream',
        userId: 'user-1',
        workoutId: 'workout-1',
        activityId: 'i123'
      },
      { jobId: 'intervals-stream:i123' }
    )
  })

  it('skips enqueue when an identical job is already queued', async () => {
    vi.mocked(streamsQueue.getJob).mockResolvedValue({
      getState: vi.fn().mockResolvedValue('waiting')
    } as any)

    await enqueueIntervalsStreamSync({
      userId: 'user-1',
      workoutId: 'workout-1',
      activityId: 'i123'
    })

    expect(streamsQueue.add).not.toHaveBeenCalled()
  })
})
