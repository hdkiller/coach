import { beforeEach, describe, expect, it, vi } from 'vitest'
import { calculateZoneDistribution } from '../../../../server/utils/training-metrics'
import { prisma } from '../../../../server/utils/db'
import { sportSettingsRepository } from '../../../../server/utils/repositories/sportSettingsRepository'

vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    },
    workoutStream: {
      findMany: vi.fn()
    },
    workout: {
      findMany: vi.fn()
    }
  }
}))

vi.mock('../../../../server/utils/repositories/sportSettingsRepository', () => ({
  sportSettingsRepository: {
    getDefault: vi.fn(),
    getForActivityType: vi.fn()
  }
}))

describe('calculateZoneDistribution sport profile selection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses the matching sport profile when all workouts are the same sport', async () => {
    const zones = [
      { name: 'Run Z1', min: 0, max: 100 },
      { name: 'Run Z2', min: 101, max: 200 }
    ]

    vi.mocked(prisma.workout.findMany).mockResolvedValue([{ id: 'w1', type: 'Run' }] as any)
    vi.mocked(prisma.workoutStream.findMany).mockResolvedValue([
      {
        workoutId: 'w1',
        heartrate: [90, 150],
        watts: [90, 150],
        hrZoneTimes: null,
        powerZoneTimes: null
      }
    ] as any)
    vi.mocked(sportSettingsRepository.getDefault).mockResolvedValue({
      hrZones: [{ name: 'Default', min: 0, max: 999 }],
      powerZones: [{ name: 'Default', min: 0, max: 999 }]
    } as any)
    vi.mocked(sportSettingsRepository.getForActivityType).mockResolvedValue({
      hrZones: zones,
      powerZones: zones
    } as any)

    const result = await calculateZoneDistribution(['w1'], 'user-1')

    expect(sportSettingsRepository.getForActivityType).toHaveBeenCalledWith('user-1', 'Run')
    expect(result.hr?.zones[0]?.name).toBe('Run Z1')
    expect(result.hr?.zones[1]?.name).toBe('Run Z2')
    expect(result.power?.zones[0]?.name).toBe('Run Z1')
    expect(result.power?.zones[1]?.name).toBe('Run Z2')
  })

  it('falls back to the default profile for mixed-sport selections', async () => {
    const defaultZones = [
      { name: 'Default Z1', min: 0, max: 100 },
      { name: 'Default Z2', min: 101, max: 200 }
    ]

    vi.mocked(prisma.workout.findMany).mockResolvedValue([
      { id: 'w1', type: 'Run' },
      { id: 'w2', type: 'Ride' }
    ] as any)
    vi.mocked(prisma.workoutStream.findMany).mockResolvedValue([
      {
        workoutId: 'w1',
        heartrate: [90, 150],
        watts: [90, 150],
        hrZoneTimes: null,
        powerZoneTimes: null
      }
    ] as any)
    vi.mocked(sportSettingsRepository.getDefault).mockResolvedValue({
      hrZones: defaultZones,
      powerZones: defaultZones
    } as any)

    const result = await calculateZoneDistribution(['w1', 'w2'], 'user-1')

    expect(sportSettingsRepository.getForActivityType).not.toHaveBeenCalled()
    expect(result.hr?.zones[0]?.name).toBe('Default Z1')
    expect(result.power?.zones[0]?.name).toBe('Default Z1')
  })
})
