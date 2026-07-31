import { beforeEach, describe, expect, it, vi } from 'vitest'

const { userFindMany, llmUsageGroupBy, dispatchTask, loggerError, loggerWarn, loggerLog } =
  vi.hoisted(() => ({
    userFindMany: vi.fn(),
    llmUsageGroupBy: vi.fn(),
    dispatchTask: vi.fn(),
    loggerError: vi.fn(),
    loggerWarn: vi.fn(),
    loggerLog: vi.fn()
  }))

vi.mock('../../../server/utils/db', () => ({
  prisma: {
    user: {
      findMany: userFindMany
    },
    llmUsage: {
      groupBy: llmUsageGroupBy
    }
  }
}))

vi.mock('../../../server/utils/task-dispatcher', () => ({
  dispatchTask
}))

vi.mock('../../../server/utils/date', () => ({
  formatUserDate: vi.fn(() => 'Friday, January 1')
}))

vi.mock('../../../server/utils/quotas/registry', () => ({
  QUOTA_REGISTRY: {
    SUPPORTER: {
      daily_checkin: { limit: 1 },
      activity_recommendation: { limit: 2 },
      workout_analysis: { limit: 3 },
      chat: { limit: 4 }
    }
  }
}))

vi.mock('@trigger.dev/sdk/v3', () => ({
  logger: {
    log: loggerLog,
    warn: loggerWarn,
    error: loggerError
  },
  schedules: {
    task: vi.fn().mockImplementation((config) => ({
      run: config.run,
      id: config.id
    }))
  }
}))

function trialUser(id: string, trialEndsAt: Date) {
  return {
    id,
    name: `User ${id}`,
    email: `${id}@example.com`,
    timezone: 'UTC',
    trialEndsAt
  }
}

describe('trialEndingReminderCron', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    llmUsageGroupBy.mockResolvedValue([])
  })

  it('continues dispatching after a mid-loop failure and reports partial counts', async () => {
    const trialEndsAt = new Date()
    trialEndsAt.setUTCDate(trialEndsAt.getUTCDate() + 2)
    trialEndsAt.setUTCHours(12, 0, 0, 0)

    userFindMany.mockResolvedValue([
      trialUser('user-1', trialEndsAt),
      trialUser('user-2', trialEndsAt),
      trialUser('user-3', trialEndsAt)
    ])

    dispatchTask
      .mockResolvedValueOnce({ id: 'run-1' })
      .mockRejectedValueOnce(new Error('dispatch failed'))
      .mockResolvedValueOnce({ id: 'run-3' })

    const { trialEndingReminderCron } = await import('../../../trigger/trial-ending-reminder')
    const result = await trialEndingReminderCron.run()

    expect(dispatchTask).toHaveBeenCalledTimes(3)
    expect(dispatchTask.mock.calls[0][1]).toEqual(
      expect.objectContaining({ userId: 'user-1', templateKey: 'TrialEndingSoon' })
    )
    expect(dispatchTask.mock.calls[1][1]).toEqual(
      expect.objectContaining({ userId: 'user-2', templateKey: 'TrialEndingSoon' })
    )
    expect(dispatchTask.mock.calls[2][1]).toEqual(
      expect.objectContaining({ userId: 'user-3', templateKey: 'TrialEndingSoon' })
    )
    expect(loggerError).toHaveBeenCalledWith(
      'Failed to dispatch trial ending reminder',
      expect.objectContaining({ userId: 'user-2' })
    )
    expect(result).toEqual({
      success: false,
      count: 3,
      dispatchedCount: 2,
      failedCount: 1,
      skippedCount: 0
    })
  })
})
