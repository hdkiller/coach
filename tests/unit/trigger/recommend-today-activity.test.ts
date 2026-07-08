import { beforeEach, describe, expect, it, vi } from 'vitest'

const { activityRecommendationUpdate, generateStructuredAnalysis } = vi.hoisted(() => ({
  activityRecommendationUpdate: vi.fn(),
  generateStructuredAnalysis: vi.fn()
}))

vi.mock('../../../trigger/init', () => ({}))

vi.mock('../../../server/utils/db', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    emailPreference: { findUnique: vi.fn() },
    plannedWorkout: { findMany: vi.fn() },
    report: { findFirst: vi.fn() },
    goal: { findMany: vi.fn() },
    weeklyTrainingPlan: { findFirst: vi.fn() },
    event: { findMany: vi.fn() },
    activityRecommendation: { update: vi.fn() }
  }
}))

vi.mock('../../../server/utils/repositories/activityRecommendationRepository', () => ({
  activityRecommendationRepository: {
    update: activityRecommendationUpdate,
    findById: vi.fn()
  }
}))

vi.mock('../../../server/utils/quotas/engine', () => ({
  checkQuota: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('../../../server/utils/ai-user-settings', () => ({
  getUserAiSettings: vi.fn().mockResolvedValue({
    aiPersona: 'Supportive',
    aiModelPreference: 'gemini-2.0-flash-exp'
  })
}))

vi.mock('../../../server/utils/date', () => ({
  formatUserDate: vi.fn(() => 'March 10, 2026'),
  getUserLocalDate: vi.fn(() => new Date('2026-03-10T00:00:00.000Z')),
  formatDateUTC: vi.fn(() => '2026-03-10'),
  calculateAge: vi.fn(() => 30),
  getEndOfDayUTC: vi.fn(() => new Date('2026-03-10T23:59:59.999Z')),
  getStartOfDaysAgoUTC: vi.fn(() => new Date('2026-03-04T00:00:00.000Z')),
  getTimestampDateKey: vi.fn(() => '2026-03-10')
}))

vi.mock('../../../server/utils/repositories/workoutRepository', () => ({
  workoutRepository: { getForUser: vi.fn().mockResolvedValue([]) }
}))

vi.mock('../../../server/utils/repositories/wellnessRepository', () => ({
  wellnessRepository: {
    getByDate: vi.fn().mockResolvedValue(null),
    getForUser: vi.fn().mockResolvedValue([])
  }
}))

vi.mock('../../../server/utils/repositories/recommendationRepository', () => ({
  recommendationRepository: { list: vi.fn().mockResolvedValue([]) }
}))

vi.mock('../../../server/utils/repositories/sportSettingsRepository', () => ({
  sportSettingsRepository: { getByUserId: vi.fn().mockResolvedValue([]) }
}))

vi.mock('../../../server/utils/repositories/availabilityRepository', () => ({
  availabilityRepository: {
    getForDay: vi.fn().mockResolvedValue(null),
    getFullSchedule: vi.fn().mockResolvedValue([]),
    formatForPrompt: vi.fn(() => '')
  }
}))

vi.mock('../../../server/utils/training-stress', () => ({
  calculateProjectedPMC: vi.fn(() => []),
  getCurrentFitnessSummary: vi.fn().mockResolvedValue({
    ctl: 50,
    atl: 40,
    tsb: 10,
    formStatus: { status: 'Fresh', description: 'Ready' },
    lastUpdated: new Date('2026-03-10T00:00:00.000Z')
  })
}))

vi.mock('../../../server/utils/services/wellness-analysis', () => ({
  analyzeWellness: vi.fn()
}))

vi.mock('../../../server/utils/services/checkin-service', () => ({
  getCheckinHistoryContext: vi.fn().mockResolvedValue('')
}))

vi.mock('../../../server/utils/services/metabolicService', () => ({
  metabolicService: { getMealTargetContext: vi.fn().mockResolvedValue(null) }
}))

vi.mock('../../../server/utils/services/bodyMetricResolver', () => ({
  bodyMetricResolver: {
    resolveEffectiveWeight: vi.fn().mockResolvedValue({ value: 70 })
  }
}))

vi.mock('../../../server/utils/services/wellnessEventService', () => ({
  getWellnessEventOverlaysForUser: vi.fn().mockResolvedValue([]),
  getActiveWellnessEventsForDate: vi.fn(() => []),
  formatWellnessEventsForPrompt: vi.fn(() => '')
}))

vi.mock('../../../server/utils/gemini', () => ({
  generateStructuredAnalysis,
  buildWorkoutSummary: vi.fn(() => '')
}))

vi.mock('@trigger.dev/sdk/v3', async () => {
  const actual = await vi.importActual('@trigger.dev/sdk/v3')
  return {
    ...actual,
    logger: {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    },
    tasks: { trigger: vi.fn(), onFailure: vi.fn() },
    task: vi.fn().mockImplementation((config) => ({
      run: config.run,
      id: config.id
    }))
  }
})

describe('recommendTodayActivityTask', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()

    const { prisma } = await import('../../../server/utils/db')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      timezone: 'UTC',
      nutritionTrackingEnabled: false,
      aiAutoAnalyzeReadiness: true,
      language: 'English'
    } as any)
    vi.mocked(prisma.emailPreference.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.plannedWorkout.findMany).mockResolvedValue([])
    vi.mocked(prisma.report.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.goal.findMany).mockResolvedValue([])
    vi.mocked(prisma.weeklyTrainingPlan.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.event.findMany).mockResolvedValue([])

    generateStructuredAnalysis.mockRejectedValue(new Error('Gemini unavailable'))
  })

  it('marks the recommendation FAILED when generation fails outside the quota handler', async () => {
    const { recommendTodayActivityTask } = await import('../../../trigger/recommend-today-activity')

    await expect(
      recommendTodayActivityTask.run({
        userId: 'user-1',
        date: new Date('2026-03-10T00:00:00.000Z'),
        recommendationId: 'rec-1'
      })
    ).rejects.toThrow('Gemini unavailable')

    expect(activityRecommendationUpdate).toHaveBeenCalledWith('rec-1', 'user-1', {
      status: 'FAILED',
      reasoning: 'Gemini unavailable'
    })
  })
})
