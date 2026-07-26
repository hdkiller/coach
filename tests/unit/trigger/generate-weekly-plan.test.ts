import { describe, it, expect, beforeEach, vi } from 'vitest'
import { runGenerateWeeklyPlan } from '../../../trigger/generate-weekly-plan'
import { prisma } from '../../../server/utils/db'

vi.mock('@trigger.dev/sdk/v3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@trigger.dev/sdk/v3')>()
  return {
    ...actual,
    logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn() }
  }
})

vi.mock('../../../server/utils/db', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    userProfile: { findUnique: vi.fn(), findFirst: vi.fn() },
    plannedWorkout: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
    trainingWeek: { findUnique: vi.fn(), update: vi.fn() },
    weeklyTrainingPlan: { findFirst: vi.fn(), create: vi.fn(), upsert: vi.fn(), update: vi.fn() },

    report: { findFirst: vi.fn() },
    goal: { findMany: vi.fn() },
    availabilitySchedule: { findMany: vi.fn() },
    trainingAvailability: { findMany: vi.fn(), findFirst: vi.fn() },
    workout: { findMany: vi.fn(), findFirst: vi.fn() },
    wellness: { findMany: vi.fn(), findFirst: vi.fn() },

    sportSettings: { findMany: vi.fn() },
    integration: { findMany: vi.fn(), findUnique: vi.fn() }
  }
}))

vi.mock('../../../server/utils/repositories/availabilityRepository', () => ({
  availabilityRepository: {
    getFullSchedule: vi.fn().mockResolvedValue([]),
    formatForPrompt: vi.fn().mockReturnValue('')
  }
}))

vi.mock('../../../server/utils/repositories/workoutRepository', () => ({
  workoutRepository: {
    getForUser: vi.fn().mockResolvedValue([]),
    formatForPrompt: vi.fn().mockReturnValue('')
  }
}))

vi.mock('../../../server/utils/repositories/wellnessRepository', () => ({
  wellnessRepository: {
    getForUser: vi.fn().mockResolvedValue([]),
    formatForPrompt: vi.fn().mockReturnValue('')
  }
}))

vi.mock('../../../server/utils/training-metrics', () => ({
  generateTrainingContext: vi
    .fn()
    .mockResolvedValue({ summaryText: '', loadTrend: { weeklyTSSAvg: 200 } })
}))

vi.mock('../../../server/utils/gemini', () => ({
  generateStructuredAnalysis: vi
    .fn()
    .mockResolvedValue({ days: [], weekSummary: 'Rest week', totalTSS: 100 })
}))

vi.mock('../../../server/utils/ai-user-settings', () => ({
  getUserAiSettings: vi.fn().mockResolvedValue({ defaultModel: 'flash' })
}))

vi.mock('../../../server/utils/quotas/engine', () => ({
  checkQuota: vi.fn().mockResolvedValue({ allowed: true })
}))

describe('generateWeeklyPlan task', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.userProfile.findFirst).mockResolvedValue(null as any)
    vi.mocked(prisma.weeklyTrainingPlan.findFirst).mockResolvedValue(null as any)
    vi.mocked(prisma.report.findFirst).mockResolvedValue(null as any)
    vi.mocked(prisma.goal.findMany).mockResolvedValue([])
    vi.mocked(prisma.trainingAvailability.findMany).mockResolvedValue([])
    vi.mocked(prisma.plannedWorkout.findMany).mockResolvedValue([])
    vi.mocked(prisma.workout.findMany).mockResolvedValue([])
    vi.mocked(prisma.wellness.findMany).mockResolvedValue([])
    vi.mocked(prisma.sportSettings.findMany).mockResolvedValue([])
  })

  it('handles missing user gracefully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    await expect(
      runGenerateWeeklyPlan({
        userId: 'user-missing',
        startDate: new Date('2026-03-16T00:00:00Z'),
        daysToPlan: 7
      })
    ).rejects.toThrow('User not found')
  })
})
