import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { prisma } from '../../../../server/utils/db'
import {
  beginStructureGenerationRun,
  hasActiveStructureGenerationRun
} from '../../../../server/utils/structure-generation-run'
import { STRUCTURE_GENERATION_RUN_STALE_AFTER_MS } from '../../../../server/utils/workout-ai-timeouts'

vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    $transaction: vi.fn(),
    plannedWorkout: {
      findFirst: vi.fn(),
      update: vi.fn()
    },
    workoutStructureGenerationRun: {
      updateMany: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn()
    }
  }
}))

describe('structure generation run', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('supersedes active runs and creates a revisioned run atomically', async () => {
    const tx = {
      plannedWorkout: {
        findFirst: vi.fn().mockResolvedValue({ id: 'pw-1' }),
        update: vi.fn().mockResolvedValue({ generationRevision: 4 })
      },
      workoutStructureGenerationRun: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockResolvedValue({
          id: 'run-1',
          generationRevision: 4,
          idempotencyKey: 'structure-generate:pw-1:rev-4'
        })
      }
    }
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(tx))

    const result = await beginStructureGenerationRun({
      plannedWorkoutId: 'pw-1',
      userId: 'user-1',
      mode: 'generate',
      source: 'api',
      requestSnapshot: { targetingOverride: null }
    })

    expect(tx.workoutStructureGenerationRun.updateMany).toHaveBeenCalledWith({
      where: { plannedWorkoutId: 'pw-1', status: { in: ['PENDING', 'RUNNING'] } },
      data: expect.objectContaining({ status: 'SUPERSEDED' })
    })
    expect(result).toEqual({
      runId: 'run-1',
      generationRevision: 4,
      idempotencyKey: 'structure-generate:pw-1:rev-4'
    })
  })

  describe('hasActiveStructureGenerationRun', () => {
    it('returns false when there are no active runs', async () => {
      vi.mocked(prisma.workoutStructureGenerationRun.findMany).mockResolvedValue([])

      const result = await hasActiveStructureGenerationRun('pw-1')

      expect(result).toBe(false)
      expect(prisma.workoutStructureGenerationRun.updateMany).not.toHaveBeenCalled()
    })

    it('returns true for a run that is still within its time budget', async () => {
      const now = new Date('2026-01-01T00:00:00.000Z')
      vi.useFakeTimers()
      vi.setSystemTime(now)

      vi.mocked(prisma.workoutStructureGenerationRun.findMany).mockResolvedValue([
        {
          id: 'run-1',
          startedAt: new Date(now.getTime() - 5_000),
          createdAt: new Date(now.getTime() - 5_000)
        }
      ] as any)

      const result = await hasActiveStructureGenerationRun('pw-1')

      expect(result).toBe(true)
      expect(prisma.workoutStructureGenerationRun.updateMany).not.toHaveBeenCalled()
    })

    it('self-heals a run stuck past the stale threshold (Trigger.dev maxDuration kill skips onFailure)', async () => {
      // Regression test for CW-2: when Trigger.dev kills a run for exceeding maxDuration, the
      // task's own cleanup/onSuccess/onFailure hooks never execute, so nothing marks the
      // WorkoutStructureGenerationRun row as failed. hasActiveStructureGenerationRun must detect
      // and reconcile these stuck rows itself, otherwise the "still generating" UI gate and the
      // chat tool's in-flight guard stay wedged forever.
      const now = new Date('2026-01-01T00:00:00.000Z')
      vi.useFakeTimers()
      vi.setSystemTime(now)

      const staleStartedAt = new Date(now.getTime() - STRUCTURE_GENERATION_RUN_STALE_AFTER_MS - 1)
      vi.mocked(prisma.workoutStructureGenerationRun.findMany).mockResolvedValue([
        { id: 'run-stale', startedAt: staleStartedAt, createdAt: staleStartedAt }
      ] as any)
      vi.mocked(prisma.workoutStructureGenerationRun.updateMany).mockResolvedValue({ count: 1 })

      const result = await hasActiveStructureGenerationRun('pw-1')

      expect(result).toBe(false)
      expect(prisma.workoutStructureGenerationRun.updateMany).toHaveBeenCalledWith({
        where: { id: 'run-stale', status: { in: ['PENDING', 'RUNNING', 'RUNNING'] } },
        data: expect.objectContaining({ status: 'FAILED' })
      })
    })

    it('falls back to createdAt when a PENDING run never started', async () => {
      const now = new Date('2026-01-01T00:00:00.000Z')
      vi.useFakeTimers()
      vi.setSystemTime(now)

      const staleCreatedAt = new Date(now.getTime() - STRUCTURE_GENERATION_RUN_STALE_AFTER_MS - 1)
      vi.mocked(prisma.workoutStructureGenerationRun.findMany).mockResolvedValue([
        { id: 'run-pending-stale', startedAt: null, createdAt: staleCreatedAt }
      ] as any)
      vi.mocked(prisma.workoutStructureGenerationRun.updateMany).mockResolvedValue({ count: 1 })

      const result = await hasActiveStructureGenerationRun('pw-1')

      expect(result).toBe(false)
      expect(prisma.workoutStructureGenerationRun.updateMany).toHaveBeenCalled()
    })

    it('treats one stale and one fresh run correctly (mixed batch)', async () => {
      const now = new Date('2026-01-01T00:00:00.000Z')
      vi.useFakeTimers()
      vi.setSystemTime(now)

      const staleStartedAt = new Date(now.getTime() - STRUCTURE_GENERATION_RUN_STALE_AFTER_MS - 1)
      const freshStartedAt = new Date(now.getTime() - 1_000)
      vi.mocked(prisma.workoutStructureGenerationRun.findMany).mockResolvedValue([
        { id: 'run-stale', startedAt: staleStartedAt, createdAt: staleStartedAt },
        { id: 'run-fresh', startedAt: freshStartedAt, createdAt: freshStartedAt }
      ] as any)
      vi.mocked(prisma.workoutStructureGenerationRun.updateMany).mockResolvedValue({ count: 1 })

      const result = await hasActiveStructureGenerationRun('pw-1')

      expect(result).toBe(true)
      expect(prisma.workoutStructureGenerationRun.updateMany).toHaveBeenCalledTimes(1)
      expect(prisma.workoutStructureGenerationRun.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: 'run-stale' }) })
      )
    })
  })
})
