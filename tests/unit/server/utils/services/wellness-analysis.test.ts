import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaWellnessFindUnique, prismaWellnessUpdate, prismaUserFindUnique, checkQuotaMock } =
  vi.hoisted(() => ({
    prismaWellnessFindUnique: vi.fn(),
    prismaWellnessUpdate: vi.fn(),
    prismaUserFindUnique: vi.fn(),
    checkQuotaMock: vi.fn()
  }))

vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    wellness: {
      findUnique: prismaWellnessFindUnique,
      update: prismaWellnessUpdate
    },
    user: {
      findUnique: prismaUserFindUnique
    }
  }
}))

vi.mock('../../../../server/utils/quotas/engine', () => ({
  checkQuota: checkQuotaMock
}))

vi.mock('../../../../server/utils/ai-user-settings', () => ({
  getUserAiSettings: vi.fn().mockResolvedValue({
    aiPersona: 'Supportive',
    aiModelPreference: 'gemini-2.0-flash-exp'
  })
}))

vi.mock('../../../../server/utils/date', () => ({
  getUserTimezone: vi.fn().mockResolvedValue('UTC'),
  getUserLocalDate: vi.fn(() => new Date('2026-03-10T00:00:00.000Z'))
}))

vi.mock('../../../../server/utils/repositories/wellnessRepository', () => ({
  wellnessRepository: {
    getForUser: vi.fn().mockResolvedValue([])
  }
}))

vi.mock('../../../../server/utils/services/wellnessEventService', () => ({
  getWellnessEventOverlaysForUser: vi.fn().mockResolvedValue([]),
  getActiveWellnessEventsForDate: vi.fn(() => []),
  formatWellnessEventsForPrompt: vi.fn(() => '')
}))

vi.mock('../../../../server/utils/services/checkin-service', () => ({
  triggerDailyCheckinIfNeeded: vi.fn()
}))

vi.mock('../../../../server/utils/gemini', () => ({
  generateStructuredAnalysis: vi.fn()
}))

describe('analyzeWellness quota enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaWellnessFindUnique.mockResolvedValue({
      id: 'wellness-1',
      date: new Date('2026-03-09T00:00:00.000Z'),
      hrv: 55,
      restingHr: 50,
      sleepHours: 7.5,
      recoveryScore: 80,
      readiness: 8,
      rawJson: {}
    })
    prismaUserFindUnique.mockResolvedValue({ language: 'English' })
  })

  it('marks wellness analysis as QUOTA_EXCEEDED when quota is exceeded', async () => {
    const { analyzeWellness } = await import('../../../../server/utils/services/wellness-analysis')

    const quotaError = Object.assign(new Error('Quota exceeded for wellness_analysis'), {
      statusCode: 429
    })
    checkQuotaMock.mockRejectedValue(quotaError)

    const result = await analyzeWellness('wellness-1', 'user-1')

    expect(checkQuotaMock).toHaveBeenCalledWith('user-1', 'wellness_analysis')
    expect(prismaWellnessUpdate).toHaveBeenCalledWith({
      where: { id: 'wellness-1' },
      data: { aiAnalysisStatus: 'QUOTA_EXCEEDED' }
    })
    expect(result).toEqual({ success: false, reason: 'QUOTA_EXCEEDED' })
  })
})
