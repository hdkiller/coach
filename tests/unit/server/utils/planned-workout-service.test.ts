import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    integration: { findFirst: vi.fn() },
    plannedWorkout: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    $transaction: vi.fn()
  }
}))

vi.mock('../../../../server/utils/intervals', () => ({
  createIntervalsPlannedWorkout: vi.fn(),
  deleteIntervalsPlannedWorkout: vi.fn(),
  normalizeIntervalsSportType: vi.fn((value: string) => value),
  isIntervalsEventId: vi.fn(() => false),
  cleanIntervalsDescription: vi.fn((value: string) => value)
}))

vi.mock('../../../../server/utils/intervals-sync', () => ({
  syncPlannedWorkoutToIntervals: vi.fn()
}))

vi.mock('../../../../server/utils/repositories/plannedWorkoutRepository', () => ({
  plannedWorkoutRepository: {
    create: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}))

vi.mock('../../../../server/utils/services/metabolicService', () => ({
  metabolicService: {
    calculateFuelingPlanForDate: vi.fn()
  }
}))

vi.mock('../../../../server/utils/nutrition/feature', () => ({
  isNutritionTrackingEnabled: vi.fn(async () => false)
}))

vi.mock('../../../../server/utils/workout-converter', () => ({
  WorkoutConverter: {
    toIntervalsICU: vi.fn()
  }
}))

vi.mock('../../../../server/utils/repositories/sportSettingsRepository', () => ({
  sportSettingsRepository: {
    getForActivityType: vi.fn()
  }
}))

describe('normalizePlannedWorkoutDate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('preserves the literal calendar day from ISO timestamps with offsets', async () => {
    const { normalizePlannedWorkoutDate } = await import(
      '../../../../server/utils/planned-workout-service'
    )

    expect(normalizePlannedWorkoutDate('2026-07-16T00:00:00+02:00').toISOString()).toBe(
      '2026-07-16T00:00:00.000Z'
    )
  })

  it('keeps plain date strings at UTC midnight', async () => {
    const { normalizePlannedWorkoutDate } = await import(
      '../../../../server/utils/planned-workout-service'
    )

    expect(normalizePlannedWorkoutDate('2026-07-19').toISOString()).toBe(
      '2026-07-19T00:00:00.000Z'
    )
  })
})
