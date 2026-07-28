import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deduplicationService } from '../../../../../server/utils/services/deduplicationService'
import { prisma } from '../../../../../server/utils/db'
import { getUserTimezone } from '../../../../../server/utils/date'

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    plannedWorkout: {
      findMany: vi.fn()
    }
  }
}))

vi.mock('../../../../../server/utils/repositories/workoutRepository', () => ({
  workoutRepository: {}
}))

vi.mock('../../../../../server/utils/date', () => ({
  formatUserDate: vi.fn((date: Date, _timezone: string, format: string) =>
    format === 'yyyy-MM-dd' ? date.toISOString().split('T')[0] : date.toISOString()
  ),
  getUserTimezone: vi.fn()
}))

vi.mock('@trigger.dev/sdk/v3', () => ({
  logger: {
    log: vi.fn()
  }
}))

describe('deduplicationService.areDuplicates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not mark same-source rides hours apart as duplicates', () => {
    const morningRide = {
      id: 'morning-ride',
      source: 'intervals',
      title: 'Velo cargo matinal',
      type: 'EBikeRide',
      date: new Date('2026-03-09T11:51:32Z'),
      durationSec: 1540
    }

    const eveningRide = {
      id: 'evening-ride',
      source: 'intervals',
      title: 'Velo cargo de fin de journee',
      type: 'EBikeRide',
      date: new Date('2026-03-09T20:55:20Z'),
      durationSec: 1434
    }

    expect(deduplicationService.areDuplicates(morningRide, eveningRide)).toBe(false)
  })

  it('allows a small cross-source timezone offset when titles or durations strongly match', () => {
    const stravaWorkout = {
      id: 'strava-ride',
      source: 'strava',
      title: 'Morning commute',
      type: 'Ride',
      date: new Date('2026-03-09T06:00:00Z'),
      durationSec: 3600
    }

    const withingsWorkout = {
      id: 'withings-ride',
      source: 'withings',
      title: 'Morning commute',
      type: 'EBikeRide',
      date: new Date('2026-03-09T08:00:00Z'),
      durationSec: 3660
    }

    expect(deduplicationService.areDuplicates(stravaWorkout, withingsWorkout)).toBe(true)
  })

  it('does not use type alone for cross-source timezone-shift matches', () => {
    const rideA = {
      id: 'ride-a',
      source: 'strava',
      title: 'Morning commute',
      type: 'Ride',
      date: new Date('2026-03-09T06:00:00Z'),
      durationSec: 3600
    }

    const rideB = {
      id: 'ride-b',
      source: 'withings',
      title: 'Evening social spin',
      type: 'Ride',
      date: new Date('2026-03-09T08:00:00Z'),
      durationSec: 5100
    }

    expect(deduplicationService.areDuplicates(rideA, rideB)).toBe(false)
  })

  it('correctly matches localized russian titles and activity types across integrations', () => {
    const intervalsWorkout = {
      id: 'intervals-1',
      source: 'intervals',
      title: 'Зальный велоспорт',
      type: 'VirtualRide',
      date: new Date('2026-03-09T10:00:00Z'),
      durationSec: 3600
    }

    const garminWorkout = {
      id: 'garmin-1',
      source: 'garmin',
      title: 'Зальный велоспорт',
      type: 'INDOOR_CYCLING',
      date: new Date('2026-03-09T10:02:00Z'),
      durationSec: 3580
    }

    expect(deduplicationService.areDuplicates(intervalsWorkout, garminWorkout)).toBe(true)
  })

  it('matches activities with strict duration match when start times are close even if titles differ', () => {
    const intervalsWorkout = {
      id: 'intervals-2',
      source: 'intervals',
      title: '20x3 (90%) и ускор',
      type: 'Ride',
      date: new Date('2026-03-10T14:30:00Z'),
      durationSec: 5400
    }

    const stravaWorkout = {
      id: 'strava-2',
      source: 'strava',
      title: 'Afternoon Ride',
      type: 'Cycling',
      date: new Date('2026-03-10T14:31:00Z'),
      durationSec: 5410
    }

    expect(deduplicationService.areDuplicates(intervalsWorkout, stravaWorkout)).toBe(true)
  })
})

describe('deduplicationService.areTypesSimilar', () => {
  it('identifies cycling type variations as similar', () => {
    expect(deduplicationService.areTypesSimilar('VirtualRide', 'INDOOR_CYCLING')).toBe(true)
    expect(deduplicationService.areTypesSimilar('Ride', 'Cycling')).toBe(true)
    expect(deduplicationService.areTypesSimilar('EBikeRide', 'Зальный велоспорт')).toBe(true)
  })

  it('identifies strength and gym variations as similar', () => {
    expect(deduplicationService.areTypesSimilar('Gym', 'WeightTraining')).toBe(true)
    expect(deduplicationService.areTypesSimilar('Strength', 'FITNESS_EQUIPMENT')).toBe(true)
  })

  it('does not match distinct activity types like Ride and Run', () => {
    expect(deduplicationService.areTypesSimilar('Ride', 'Run')).toBe(false)
  })
})

describe('deduplicationService.calculateCompletenessScore', () => {
  it('correctly scores cycling workouts with power, streams, and distanceMeters', () => {
    const workout = {
      source: 'intervals',
      type: 'Cycling',
      averageWatts: 220,
      normalizedPower: 240,
      tss: 75,
      averageHr: 150,
      distanceMeters: 45000,
      streams: [{ id: 's1' }],
      description: 'Solid workout session'
    }

    const score = deduplicationService.calculateCompletenessScore(workout)
    expect(score).toBeGreaterThan(150)
  })
})

describe('deduplicationService.findProposedLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUserTimezone).mockResolvedValue('America/Chicago')
  })

  it('matches planned workouts using the athlete local day, not the workout timestamp', async () => {
    vi.mocked(prisma.plannedWorkout.findMany).mockResolvedValue([
      { id: 'planned-1', title: 'VO2 Max Mixer' }
    ] as any)

    const result = await deduplicationService.findProposedLink({
      userId: 'user-1',
      date: new Date('2026-03-29T11:35:10Z'),
      type: 'Ride',
      durationSec: 3600
    })

    expect(getUserTimezone).toHaveBeenCalledWith('user-1')
    expect(prisma.plannedWorkout.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        date: new Date('2026-03-29T00:00:00Z'),
        completed: false
      },
      select: {
        id: true,
        title: true,
        type: true,
        durationSec: true,
        date: true,
        completed: true,
        completionStatus: true
      }
    })
    expect(result).toEqual({ id: 'planned-1', title: 'VO2 Max Mixer' })
  })
})
