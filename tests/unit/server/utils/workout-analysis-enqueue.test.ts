import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  enqueueAutomaticWorkoutAnalysesForUser,
  enqueueWorkoutAnalysis
} from '../../../../server/utils/workout-analysis-enqueue'
import { prisma } from '../../../../server/utils/db'
import { dispatchTask } from '../../../../server/utils/task-dispatcher'

vi.mock('../../../../server/utils/task-dispatcher', () => ({
  dispatchTask: vi.fn()
}))

vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    workout: {
      updateMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn()
    }
  }
}))

vi.mock('../../../../server/utils/repositories/auditLogRepository', () => ({
  auditLogRepository: { log: vi.fn() }
}))

describe('workout analysis enqueue', () => {
  beforeEach(() => vi.clearAllMocks())

  it('claims the workout before triggering analysis', async () => {
    vi.mocked(prisma.workout.updateMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(dispatchTask).mockResolvedValue({ id: 'run-1' })

    const result = await enqueueWorkoutAnalysis({
      workoutId: 'workout-1',
      userId: 'user-1',
      currentStatus: 'NOT_STARTED',
      source: 'AUTOMATIC'
    })

    expect(prisma.workout.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'workout-1',
        userId: 'user-1',
        aiAnalysisStatus: 'NOT_STARTED'
      },
      data: { aiAnalysisStatus: 'PENDING' }
    })
    expect(dispatchTask).toHaveBeenCalledOnce()
    expect(result).toEqual({ queued: true, status: 'PENDING', runId: 'run-1' })
  })

  it('does not enqueue when another caller already claimed the workout', async () => {
    vi.mocked(prisma.workout.updateMany).mockResolvedValue({ count: 0 } as any)
    vi.mocked(prisma.workout.findFirst).mockResolvedValue({ aiAnalysisStatus: 'PENDING' } as any)

    const result = await enqueueWorkoutAnalysis({
      workoutId: 'workout-1',
      userId: 'user-1',
      currentStatus: 'NOT_STARTED',
      source: 'MANUAL'
    })

    expect(dispatchTask).not.toHaveBeenCalled()
    expect(result).toEqual({ queued: false, status: 'PENDING' })
  })

  it('restores the prior status if triggering fails', async () => {
    vi.mocked(prisma.workout.updateMany)
      .mockResolvedValueOnce({ count: 1 } as any)
      .mockResolvedValueOnce({ count: 1 } as any)
    vi.mocked(dispatchTask).mockRejectedValue(new Error('Trigger unavailable'))

    await expect(
      enqueueWorkoutAnalysis({
        workoutId: 'workout-1',
        userId: 'user-1',
        currentStatus: 'FAILED',
        source: 'AUTOMATIC'
      })
    ).rejects.toThrow('Trigger unavailable')

    expect(prisma.workout.updateMany).toHaveBeenLastCalledWith({
      where: {
        id: 'workout-1',
        userId: 'user-1',
        aiAnalysisStatus: 'PENDING'
      },
      data: { aiAnalysisStatus: 'FAILED' }
    })
  })

  it('runs independently for users with automatic analysis enabled', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ aiAutoAnalyzeWorkouts: true } as any)
    vi.mocked(prisma.workout.findMany).mockResolvedValue([
      {
        id: 'workout-1',
        title: 'Intervals',
        date: new Date('2026-07-24T10:00:00Z'),
        type: 'Ride',
        aiAnalysisStatus: 'NOT_STARTED'
      }
    ] as any)
    vi.mocked(prisma.workout.updateMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(dispatchTask).mockResolvedValue({ id: 'run-1' })

    await expect(enqueueAutomaticWorkoutAnalysesForUser('user-1')).resolves.toEqual({
      enabled: true,
      queued: 1
    })
  })
})
