import { beforeEach, describe, expect, it, vi } from 'vitest'
import { triggerWorkoutDeduplicationIfEnabled } from '../../../../server/utils/trigger-workout-deduplication'
import { shouldAutoDeduplicateWorkoutsAfterIngestion } from '../../../../server/utils/ingestion-settings'
import { dispatchTask, isTaskRunningForUser } from '../../../../server/utils/task-dispatcher'

vi.mock('../../../../server/utils/task-dispatcher', () => ({
  dispatchTask: vi.fn().mockResolvedValue({ id: 'redis:run-1' }),
  isTaskRunningForUser: vi.fn().mockResolvedValue(false)
}))

vi.mock('../../../../server/utils/ingestion-settings', () => ({
  shouldAutoDeduplicateWorkoutsAfterIngestion: vi.fn().mockResolvedValue(true)
}))

describe('triggerWorkoutDeduplicationIfEnabled', () => {
  const userId = 'user-1'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(shouldAutoDeduplicateWorkoutsAfterIngestion).mockResolvedValue(true)
    vi.mocked(isTaskRunningForUser).mockResolvedValue(false)
  })

  it('triggers deduplicate-workouts when enabled and no run is active', async () => {
    const triggered = await triggerWorkoutDeduplicationIfEnabled(userId)

    expect(triggered).toBe(true)
    expect(dispatchTask).toHaveBeenCalledWith(
      'deduplicate-workouts',
      { userId, dryRun: false },
      {
        concurrencyKey: userId,
        tags: [`user:${userId}`]
      }
    )
  })

  it('returns false when auto deduplication is disabled', async () => {
    vi.mocked(shouldAutoDeduplicateWorkoutsAfterIngestion).mockResolvedValue(false)

    const triggered = await triggerWorkoutDeduplicationIfEnabled(userId)

    expect(triggered).toBe(false)
    expect(dispatchTask).not.toHaveBeenCalled()
  })

  it('returns false when a deduplication run is already active', async () => {
    vi.mocked(isTaskRunningForUser).mockResolvedValue(true)

    const triggered = await triggerWorkoutDeduplicationIfEnabled(userId)

    expect(triggered).toBe(false)
    expect(dispatchTask).not.toHaveBeenCalled()
  })
})
