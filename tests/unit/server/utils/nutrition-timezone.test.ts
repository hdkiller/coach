import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildAthleteContext } from '../../../../server/utils/services/chatContextService'
import { prisma } from '../../../../server/utils/db'
import { nutritionRepository } from '../../../../server/utils/repositories/nutritionRepository'
import { workoutRepository } from '../../../../server/utils/repositories/workoutRepository'
import { plannedWorkoutRepository } from '../../../../server/utils/repositories/plannedWorkoutRepository'
import { nutritionTools } from '../../../../server/utils/ai-tools/nutrition'
import { wellnessTools } from '../../../../server/utils/ai-tools/wellness'
import { metabolicService } from '../../../../server/utils/services/metabolicService'
import { calculateEnergyTimeline } from '../../../../server/utils/nutrition-domain'

// Mock dependencies
vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    goal: { findMany: vi.fn() },
    plannedWorkout: { findMany: vi.fn(), findFirst: vi.fn() },
    trainingAvailability: { findMany: vi.fn() },
    weeklyTrainingPlan: { findFirst: vi.fn() },
    nutrition: { findMany: vi.fn() },
    wellness: { findMany: vi.fn() },
    integration: { findUnique: vi.fn() },
    calendarNote: { findMany: vi.fn().mockResolvedValue([]) },
    athleteJourneyEvent: { findMany: vi.fn().mockResolvedValue([]) }
  }
}))

vi.mock('../../../../server/utils/repositories/sportSettingsRepository', () => ({
  sportSettingsRepository: {
    getByUserId: vi.fn().mockResolvedValue([])
  }
}))

vi.mock('../../../../server/utils/repositories/workoutRepository', () => ({
  workoutRepository: {
    getForUser: vi.fn().mockResolvedValue([])
  }
}))

vi.mock('../../../../server/utils/repositories/nutritionRepository', () => ({
  nutritionRepository: {
    getForUser: vi.fn().mockResolvedValue([])
  }
}))

vi.mock('../../../../server/utils/repositories/wellnessRepository', () => ({
  wellnessRepository: {
    getForUser: vi.fn().mockResolvedValue([])
  }
}))

vi.mock('../../../../server/utils/repositories/plannedWorkoutRepository', () => ({
  plannedWorkoutRepository: {
    list: vi.fn().mockResolvedValue([])
  }
}))

vi.mock('../../../../server/utils/training-metrics', () => ({
  generateTrainingContext: vi.fn().mockResolvedValue({ summary: {} }),
  formatTrainingContextForPrompt: vi.fn().mockReturnValue('Mocked Training Context')
}))

vi.mock('../../../../server/utils/services/metabolicService', () => ({
  metabolicService: {
    getMetabolicStateForDate: vi.fn(),
    getDailyTimeline: vi.fn()
  }
}))

vi.mock('../../../../server/utils/nutrition/settings', () => ({
  getUserNutritionSettings: vi.fn().mockResolvedValue({
    fuelState1Min: 2.5,
    metabolicFloor: 0.6
  })
}))

vi.mock('../../../../server/utils/services/bodyMetricResolver', () => ({
  bodyMetricResolver: {
    resolveEffectiveWeight: vi.fn().mockResolvedValue({
      value: 70,
      source: { type: 'profile', label: 'Profile' }
    })
  }
}))

// getWaveRange/getMetabolicStatesForRange (CW-84) exercise the real nutrition simulation
// per-day. Everything except the day-grouping logic under test is stubbed out so the test only
// asserts which day a workout timestamp is bucketed into.
vi.mock('../../../../server/utils/nutrition-domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../server/utils/nutrition-domain')>()
  return {
    ...actual,
    calculateEnergyTimeline: vi.fn().mockReturnValue([{ level: 70, fluidDeficit: 0 }]),
    synthesizeRefills: vi.fn().mockReturnValue([]),
    estimateDailyCarbTargetGrams: vi.fn().mockReturnValue(300)
  }
})

describe('Nutrition Timezone Handling', () => {
  const userId = 'user-123'
  // Central Time is UTC-6
  const timezone = 'America/Chicago'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display nutrition date correctly for Central USA timezone in chat context', async () => {
    // Today is Jan 29, 2026
    const nutritionDate = new Date('2026-01-29T00:00:00.000Z')

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      name: 'Test User',
      timezone,
      nutritionTrackingEnabled: true,
      aiPersona: 'Supportive'
    } as any)

    vi.mocked(nutritionRepository.getForUser).mockResolvedValue([
      {
        id: 'nut-1',
        date: nutritionDate,
        calories: 2000,
        protein: 150,
        carbs: 250,
        fat: 60,
        aiAnalysisJson: null
      }
    ] as any)

    vi.mocked(prisma.goal.findMany).mockResolvedValue([])
    vi.mocked(prisma.plannedWorkout.findMany).mockResolvedValue([])
    vi.mocked(prisma.plannedWorkout.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.trainingAvailability.findMany).mockResolvedValue([])
    vi.mocked(prisma.weeklyTrainingPlan.findFirst).mockResolvedValue(null)

    const result = await buildAthleteContext(userId)

    // PROOF: If it correctly handles timezone, it should show 2026-01-29
    // If it incorrectly shifted (via formatUserDate), it would show 2026-01-28
    expect(result.context).toContain('2026-01-29')
    expect(result.context).not.toContain('2026-01-28')
  })

  it('should return correct date in get_nutrition_log tool for Central USA timezone', async () => {
    const nutritionDate = new Date('2026-01-29T00:00:00.000Z')

    vi.mocked(prisma.nutrition.findMany).mockResolvedValue([
      {
        id: 'nut-1',
        date: nutritionDate,
        calories: 2000,
        protein: 150,
        carbs: 250,
        fat: 60,
        aiAnalysis: null
      }
    ] as any)

    const tools = nutritionTools(userId, timezone)
    const result = await (tools.get_nutrition_log.execute as any)({
      start_date: '2026-01-29',
      end_date: '2026-01-29'
    })

    expect(result.entries[0].date).toBe('2026-01-29')
  })

  it('should return correct date in get_wellness_metrics tool for Central USA timezone', async () => {
    const wellnessDate = new Date('2026-01-29T00:00:00.000Z')

    vi.mocked(prisma.wellness.findMany).mockResolvedValue([
      {
        id: 'wel-1',
        date: wellnessDate,
        recoveryScore: 85,
        hrv: 65,
        restingHr: 52
      }
    ] as any)

    const tools = wellnessTools(userId, timezone)
    const result = await (tools.get_wellness_metrics.execute as any)({
      start_date: '2026-01-29',
      end_date: '2026-01-29'
    })

    expect(result.metrics[0].date).toBe('2026-01-29')
  })

  it('should derive daily fueling status from canonical metabolic chain/timeline', async () => {
    vi.mocked(metabolicService.getMetabolicStateForDate).mockResolvedValue({
      startingGlycogen: 3,
      startingFluid: 120
    } as any)

    vi.mocked(metabolicService.getDailyTimeline).mockResolvedValue({
      points: [
        { time: '08:00', level: 4 },
        { time: '12:00', level: 2, eventType: 'workout', event: 'Workout A' },
        { time: '15:00', level: 8, eventType: 'workout', event: 'Workout B' }
      ],
      dayNutrition: {
        calories: 1401,
        caloriesGoal: 2000,
        carbs: 155.2,
        carbsGoal: 250
      },
      liveStatus: {
        percentage: 2,
        state: 3,
        advice: 'Low fuel',
        breakdown: {
          midnightBaseline: 3,
          replenishment: { value: 19 },
          depletion: [{ value: 8 }, { value: 6 }]
        }
      }
    } as any)

    const tools = nutritionTools(userId, timezone, {} as any)
    const result = await (tools.get_daily_fueling_status.execute as any)({
      date: '2026-01-29'
    })

    expect(metabolicService.getMetabolicStateForDate).toHaveBeenCalledOnce()
    expect(metabolicService.getDailyTimeline).toHaveBeenCalledOnce()
    expect(result.fuel_tank.level).toBe(2)
    expect(result.fuel_tank.breakdown.baseline).toBe(3)
    expect(result.fuel_tank.breakdown.replenished).toBe(19)
    expect(result.workouts_on_day).toBe(2)
    expect(result.nutrition_summary.calories.logged).toBe(1401)
  })
})

describe('getWaveRange / getMetabolicStatesForRange local-day workout grouping (CW-84)', () => {
  const userId = 'user-tz-84'
  // Fixed UTC+2 offset (no DST), so the local-vs-UTC day boundary is unambiguous.
  const timezone = 'Etc/GMT-2'

  // 00:30 local time on Feb 15 is 22:30 UTC on Feb 14 - the previous UTC calendar day.
  const localMidnightThirtyWorkout = new Date('2026-02-14T22:30:00.000Z')

  const startDate = new Date('2026-02-14T00:00:00.000Z')
  const endDate = new Date('2026-02-15T00:00:00.000Z')

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      timezone,
      weight: 70,
      weightSourceMode: 'MANUAL',
      ftp: 250
    } as any)
    vi.mocked(prisma.athleteJourneyEvent.findMany).mockResolvedValue([] as any)
    vi.mocked(nutritionRepository.getForUser).mockResolvedValue([])
    vi.mocked(plannedWorkoutRepository.list).mockResolvedValue([])
  })

  it('buckets a workout logged at 00:30 local (+2 TZ) onto the correct local day, not the UTC day', async () => {
    vi.mocked(workoutRepository.getForUser).mockResolvedValue([
      {
        id: 'w1',
        date: localMidnightThirtyWorkout,
        durationSec: 3600,
        intensity: 0.7,
        type: 'Ride'
      }
    ] as any)

    const { metabolicService: realMetabolicService } = await vi.importActual<
      typeof import('../../../../server/utils/services/metabolicService')
    >('../../../../server/utils/services/metabolicService')

    vi.spyOn(realMetabolicService, 'getMetabolicStateForDate').mockResolvedValue({
      startingGlycogen: 70,
      startingFluid: 0
    } as any)

    await realMetabolicService.getWaveRange(userId, startDate, endDate)

    const calls = vi.mocked(calculateEnergyTimeline).mock.calls
    expect(calls).toHaveLength(2)

    // Call 0 = Feb 14 (local), Call 1 = Feb 15 (local) - the day-by-day loop runs in order.
    const feb14Workouts = calls[0]![1] as any[]
    const feb15Workouts = calls[1]![1] as any[]

    expect(feb14Workouts.map((w) => w.id)).not.toContain('w1')
    expect(feb15Workouts.map((w) => w.id)).toContain('w1')
  })

  it('getMetabolicStatesForRange buckets the same 00:30 local workout onto the correct local day', async () => {
    vi.mocked(workoutRepository.getForUser).mockResolvedValue([
      {
        id: 'w1',
        date: localMidnightThirtyWorkout,
        durationSec: 3600,
        intensity: 0.7,
        type: 'Ride'
      }
    ] as any)

    const { metabolicService: realMetabolicService } = await vi.importActual<
      typeof import('../../../../server/utils/services/metabolicService')
    >('../../../../server/utils/services/metabolicService')

    vi.spyOn(realMetabolicService, 'getMetabolicStateForDate').mockResolvedValue({
      startingGlycogen: 70,
      startingFluid: 0
    } as any)

    await realMetabolicService.getMetabolicStatesForRange(userId, startDate, endDate)

    const calls = vi.mocked(calculateEnergyTimeline).mock.calls
    expect(calls).toHaveLength(2)

    const feb14Workouts = calls[0]![1] as any[]
    const feb15Workouts = calls[1]![1] as any[]

    expect(feb14Workouts.map((w) => w.id)).not.toContain('w1')
    expect(feb15Workouts.map((w) => w.id)).toContain('w1')
  })
})
