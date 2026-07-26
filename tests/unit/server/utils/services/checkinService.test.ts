import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  runGenerateDailyCheckin,
  getCheckinHistoryContext,
  triggerDailyCheckinIfNeeded
} from '../../../../../server/utils/services/checkin-service'
import { dailyCheckinRepository } from '../../../../../server/utils/repositories/dailyCheckinRepository'
import { hasTaskHandler, getTaskHandler } from '../../../../../server/utils/task-registry'
import * as dispatcher from '../../../../../server/utils/task-dispatcher'

vi.mock('../../../../../server/utils/repositories/dailyCheckinRepository', () => ({
  dailyCheckinRepository: {
    getByDate: vi.fn(),
    getHistory: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/repositories/auditLogRepository', () => ({
  auditLogRepository: {
    log: vi.fn().mockResolvedValue({})
  }
}))

vi.mock('../../../../../server/utils/date', () => ({
  getUserTimezone: vi.fn().mockResolvedValue('UTC'),
  getUserLocalDate: vi.fn().mockReturnValue(new Date('2026-03-15T00:00:00Z')),
  formatDateUTC: vi.fn((date) =>
    date instanceof Date ? date.toISOString().split('T')[0] : '2026-03-15'
  ),
  formatUserDate: vi.fn(() => '2026-03-15'),
  calculateAge: vi.fn().mockReturnValue(30)
}))

vi.mock('../../../../../server/utils/task-dispatcher', () => ({
  dispatchTask: vi.fn().mockResolvedValue({ id: 'task_123' })
}))

describe('Daily Check-in Service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('registers generate-daily-checkin task handler automatically', () => {
    expect(hasTaskHandler('generate-daily-checkin')).toBe(true)
    expect(getTaskHandler('generate-daily-checkin')).toBe(runGenerateDailyCheckin)
  })

  it('returns false when check-in already exists for today in triggerDailyCheckinIfNeeded', async () => {
    vi.mocked(dailyCheckinRepository.getByDate).mockResolvedValueOnce({ id: 'c1' } as any)

    const result = await triggerDailyCheckinIfNeeded('u123')

    expect(result).toEqual({ triggered: false, reason: 'Daily check-in already exists for today' })
    expect(dispatcher.dispatchTask).not.toHaveBeenCalled()
  })

  it('dispatches generate-daily-checkin task when check-in is missing in triggerDailyCheckinIfNeeded', async () => {
    vi.mocked(dailyCheckinRepository.getByDate).mockResolvedValueOnce(null)

    const result = await triggerDailyCheckinIfNeeded('u123')

    expect(result).toEqual({ triggered: true })
    expect(dispatcher.dispatchTask).toHaveBeenCalledWith(
      'generate-daily-checkin',
      expect.objectContaining({ userId: 'u123', source: 'auto' }),
      expect.objectContaining({ concurrencyKey: 'u123' })
    )
  })

  it('formats past check-in history context properly', async () => {
    vi.mocked(dailyCheckinRepository.getHistory).mockResolvedValueOnce([
      {
        date: new Date('2026-03-14T00:00:00Z'),
        userNotes: 'Feeling fresh today',
        questions: [{ text: 'Any muscle soreness?', answer: 'No' }]
      }
    ] as any)

    const historyStr = await getCheckinHistoryContext(
      'u123',
      new Date('2026-03-08T00:00:00Z'),
      new Date('2026-03-14T00:00:00Z'),
      'UTC'
    )

    expect(historyStr).toContain('[2026-03-14]')
    expect(historyStr).toContain('* Q: "Any muscle soreness?"')
    expect(historyStr).toContain('A: No')
    expect(historyStr).toContain('User Notes: "Feeling fresh today"')
  })
})
