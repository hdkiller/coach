import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  findMatchingPlannedWorkoutForWorkout,
  linkWorkoutToMatchingPlannedWorkout
} from './planned-workout-linking'
import { prisma } from './db'
import { publishActivityEvent } from './activity-realtime'

vi.mock('./db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    },
    plannedWorkout: {
      findMany: vi.fn()
    },
    $transaction: vi.fn()
  }
}))

vi.mock('./activity-realtime', () => ({
  publishActivityEvent: vi.fn()
}))

const workout = {
  id: 'workout-1',
  userId: 'user-1',
  date: new Date('2026-04-17T05:41:08.000Z'),
  type: 'Run',
  durationSec: 2602,
  plannedWorkoutId: null
}

describe('planned workout linking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ timezone: 'Europe/Budapest' } as any)
  })

  it('matches a Strava workout to the planned workout on the athlete local day', async () => {
    vi.mocked(prisma.plannedWorkout.findMany).mockResolvedValue([
      {
        id: 'planned-1',
        title: 'Konnyu futas',
        type: 'Run',
        durationSec: 2400,
        date: new Date('2026-04-17T00:00:00.000Z'),
        completed: false,
        completionStatus: 'PENDING'
      }
    ] as any)

    const result = await findMatchingPlannedWorkoutForWorkout(workout as any)

    expect(result?.id).toBe('planned-1')
    expect(prisma.plannedWorkout.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          date: new Date('2026-04-17T00:00:00.000Z'),
          completed: false
        })
      })
    )
  })

  it('links the workout and marks the planned workout completed in one transaction', async () => {
    vi.mocked(prisma.plannedWorkout.findMany).mockResolvedValue([
      {
        id: 'planned-1',
        title: 'Konnyu futas',
        type: 'Run',
        durationSec: 2400,
        date: new Date('2026-04-17T00:00:00.000Z'),
        completed: false,
        completionStatus: 'PENDING'
      }
    ] as any)

    const tx = {
      workout: {
        findFirst: vi.fn().mockResolvedValue({ plannedWorkoutId: null }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 })
      },
      plannedWorkout: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 })
      }
    }
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(tx))

    const result = await linkWorkoutToMatchingPlannedWorkout(workout as any)

    expect(result).toEqual({ linked: true, plannedWorkoutId: 'planned-1' })
    expect(tx.plannedWorkout.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'planned-1',
        userId: 'user-1',
        completed: false
      },
      data: {
        completed: true,
        completionStatus: 'COMPLETED'
      }
    })
    expect(tx.workout.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'workout-1',
        userId: 'user-1',
        plannedWorkoutId: null
      },
      data: {
        plannedWorkoutId: 'planned-1'
      }
    })
    expect(publishActivityEvent).toHaveBeenCalledTimes(2)
  })
})
