import { beforeEach, describe, expect, it, vi } from 'vitest'

import { athleteMetricsService } from '../../../../server/utils/athleteMetricsService'

const { updateManyMock } = vi.hoisted(() => ({
  updateManyMock: vi.fn()
}))

vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    recommendation: {
      updateMany: updateManyMock
    }
  }
}))

vi.mock('../../../../server/utils/repositories/userRepository', () => ({
  userRepository: {
    getById: vi.fn()
  }
}))

vi.mock('../../../../server/utils/repositories/sportSettingsRepository', () => ({
  sportSettingsRepository: {
    getDefault: vi.fn(),
    getForActivityType: vi.fn()
  }
}))

vi.mock('../../../../server/utils/zones', () => ({
  calculatePowerZones: vi.fn(() => []),
  calculateHrZones: vi.fn(() => [])
}))

vi.mock('../../../../server/utils/services/metabolicService', () => ({
  metabolicService: {
    calculateFuelingPlanForDate: vi.fn()
  }
}))

vi.mock('../../../../server/utils/date', () => ({
  getUserLocalDate: vi.fn(),
  getUserTimezone: vi.fn()
}))

vi.mock('../../../../server/utils/nutrition/feature', () => ({
  isNutritionTrackingEnabled: vi.fn()
}))

describe('athleteMetricsService.resolveThresholdRecommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateManyMock.mockResolvedValue({ count: 1 })
  })

  it('resolves workout recommendations for max hr and threshold pace', async () => {
    await athleteMetricsService.resolveThresholdRecommendations('user-1', {
      maxHr: 190,
      thresholdPace: 4.1
    })

    expect(updateManyMock).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        metric: { in: ['MAX_HR', 'THRESHOLD_PACE'] },
        status: 'ACTIVE',
        sourceType: 'workout'
      },
      data: {
        status: 'COMPLETED',
        completedAt: expect.any(Date)
      }
    })
  })
})
