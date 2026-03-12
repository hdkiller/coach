import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deduplicationService } from '../../../../../server/utils/services/deduplicationService'

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {}
}))

vi.mock('../../../../../server/utils/repositories/workoutRepository', () => ({
  workoutRepository: {}
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
})
