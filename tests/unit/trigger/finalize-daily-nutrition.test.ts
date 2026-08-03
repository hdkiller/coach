import { beforeEach, describe, expect, it, vi } from 'vitest'

const { userFindMany, dispatchTask, loggerError, loggerWarn, loggerLog } = vi.hoisted(() => ({
  userFindMany: vi.fn(),
  dispatchTask: vi.fn(),
  loggerError: vi.fn(),
  loggerWarn: vi.fn(),
  loggerLog: vi.fn()
}))

vi.mock('../../../server/utils/db', () => ({
  prisma: {
    user: {
      findMany: userFindMany
    }
  }
}))

vi.mock('../../../server/utils/task-dispatcher', () => ({
  dispatchTask
}))

vi.mock('../../../server/utils/date', () => ({
  getUserTimezone: vi.fn(),
  getUserLocalDate: vi.fn()
}))

vi.mock('../../../server/utils/services/metabolicService', () => ({
  metabolicService: {
    finalizeDay: vi.fn()
  }
}))

vi.mock('@trigger.dev/sdk/v3', () => ({
  logger: {
    log: loggerLog,
    warn: loggerWarn,
    error: loggerError
  },
  task: vi.fn().mockImplementation((config) => ({
    run: config.run,
    id: config.id
  })),
  schedules: {
    task: vi.fn().mockImplementation((config) => ({
      run: config.run,
      id: config.id
    }))
  }
}))

describe('finalizeDailyNutritionCron', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('continues dispatching after a mid-batch failure and reports partial counts', async () => {
    userFindMany.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }, { id: 'user-3' }])
    dispatchTask
      .mockResolvedValueOnce({ id: 'run-1' })
      .mockRejectedValueOnce(new Error('dispatch failed'))
      .mockResolvedValueOnce({ id: 'run-3' })

    const { finalizeDailyNutritionCron } = await import('../../../trigger/finalize-daily-nutrition')
    const result = await finalizeDailyNutritionCron.run()

    expect(dispatchTask).toHaveBeenCalledTimes(3)
    expect(dispatchTask).toHaveBeenNthCalledWith(1, 'finalize-daily-nutrition', {
      userId: 'user-1'
    })
    expect(dispatchTask).toHaveBeenNthCalledWith(2, 'finalize-daily-nutrition', {
      userId: 'user-2'
    })
    expect(dispatchTask).toHaveBeenNthCalledWith(3, 'finalize-daily-nutrition', {
      userId: 'user-3'
    })
    expect(loggerError).toHaveBeenCalledWith(
      'Failed to dispatch finalize-daily-nutrition',
      expect.objectContaining({ userId: 'user-2' })
    )
    expect(result).toEqual({
      success: false,
      count: 3,
      dispatchedCount: 2,
      failedCount: 1
    })
  })
})
