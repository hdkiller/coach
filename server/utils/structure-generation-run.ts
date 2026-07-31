import type { Prisma } from '@prisma/client'
import { prisma } from './db'
import type { StructureRunSource } from './trigger-run-tags'
import { STRUCTURE_GENERATION_RUN_STALE_AFTER_MS } from './workout-ai-timeouts'

export type StructureGenerationMode = 'generate' | 'adjust'
export type StructureGenerationRunStatus =
  'PENDING' | 'RUNNING' | 'COMPLETED' | 'STALE' | 'FAILED' | 'SUPERSEDED'

const ACTIVE_STATUSES: StructureGenerationRunStatus[] = ['PENDING', 'RUNNING']

export type BeginStructureGenerationRunOptions = {
  plannedWorkoutId: string
  userId: string
  mode: StructureGenerationMode
  source: StructureRunSource
  requestSnapshot?: Record<string, unknown>
}

export type BeginStructureGenerationRunResult = {
  runId: string
  generationRevision: number
  idempotencyKey: string
}

function buildIdempotencyKey(
  mode: StructureGenerationMode,
  plannedWorkoutId: string,
  generationRevision: number
) {
  return `structure-${mode}:${plannedWorkoutId}:rev-${generationRevision}`
}

/** Atomically supersedes active runs, bumps generationRevision, and records a new run. */
export async function beginStructureGenerationRun(
  options: BeginStructureGenerationRunOptions
): Promise<BeginStructureGenerationRunResult> {
  return prisma.$transaction(async (tx) => {
    const workout = await tx.plannedWorkout.findFirst({
      where: { id: options.plannedWorkoutId, userId: options.userId },
      select: { id: true }
    })
    if (!workout) throw new Error('Planned workout not found')

    await tx.workoutStructureGenerationRun.updateMany({
      where: {
        plannedWorkoutId: options.plannedWorkoutId,
        status: { in: ACTIVE_STATUSES }
      },
      data: { status: 'SUPERSEDED', completedAt: new Date() }
    })

    const updated = await tx.plannedWorkout.update({
      where: { id: options.plannedWorkoutId },
      data: { generationRevision: { increment: 1 } },
      select: { generationRevision: true }
    })

    const idempotencyKey = buildIdempotencyKey(
      options.mode,
      options.plannedWorkoutId,
      updated.generationRevision
    )

    const run = await tx.workoutStructureGenerationRun.create({
      data: {
        plannedWorkoutId: options.plannedWorkoutId,
        userId: options.userId,
        mode: options.mode,
        generationRevision: updated.generationRevision,
        idempotencyKey,
        status: 'PENDING',
        source: options.source,
        requestSnapshot: (options.requestSnapshot || undefined) as Prisma.InputJsonValue | undefined
      }
    })

    return {
      runId: run.id,
      generationRevision: updated.generationRevision,
      idempotencyKey
    }
  })
}

export async function markStructureGenerationRunRunning(
  runId: string,
  triggerRunId?: string | null
) {
  await prisma.workoutStructureGenerationRun.updateMany({
    where: { id: runId, status: { in: ACTIVE_STATUSES } },
    data: {
      status: 'RUNNING',
      triggerRunId: triggerRunId || undefined,
      startedAt: new Date()
    }
  })
}

export async function markStructureGenerationRunCompleted(runId: string) {
  await prisma.workoutStructureGenerationRun.updateMany({
    where: { id: runId, status: { in: [...ACTIVE_STATUSES, 'RUNNING'] } },
    data: { status: 'COMPLETED', completedAt: new Date(), error: null }
  })
}

export async function markStructureGenerationRunStale(runId: string) {
  await prisma.workoutStructureGenerationRun.updateMany({
    where: { id: runId, status: { in: [...ACTIVE_STATUSES, 'RUNNING'] } },
    data: {
      status: 'STALE',
      completedAt: new Date(),
      error: 'Superseded by a newer generation revision before persistence'
    }
  })
}

export async function markStructureGenerationRunFailed(runId: string, error: string) {
  await prisma.workoutStructureGenerationRun.updateMany({
    where: { id: runId, status: { in: [...ACTIVE_STATUSES, 'RUNNING'] } },
    data: {
      status: 'FAILED',
      completedAt: new Date(),
      error: error.slice(0, 2000)
    }
  })
}

/** Returns false when the run revision no longer matches the workout fence. */
export async function isStructureGenerationRunCurrent(runId: string): Promise<boolean> {
  const run = await prisma.workoutStructureGenerationRun.findUnique({
    where: { id: runId },
    select: {
      generationRevision: true,
      plannedWorkout: { select: { generationRevision: true } }
    }
  })
  if (!run) return false
  return run.generationRevision === run.plannedWorkout.generationRevision
}

export async function attachTriggerRunId(runId: string, triggerRunId: string) {
  await prisma.workoutStructureGenerationRun.update({
    where: { id: runId },
    data: { triggerRunId }
  })
}

/**
 * Returns true when this workout has a run genuinely in progress. Also self-heals: a hard
 * Trigger.dev `maxDuration` kill skips the task's own lifecycle hooks (see
 * STRUCTURE_GENERATION_RUN_STALE_AFTER_MS), so a PENDING/RUNNING row can outlive the run that
 * created it. Any such row older than the stale threshold is reconciled to FAILED here and does
 * not count as active, so callers (the "still generating" UI gate, the chat tool's in-flight
 * guard) recover on their own without needing a separate reconciliation job.
 */
export async function hasActiveStructureGenerationRun(plannedWorkoutId: string): Promise<boolean> {
  const activeRuns = await prisma.workoutStructureGenerationRun.findMany({
    where: {
      plannedWorkoutId,
      status: { in: ACTIVE_STATUSES }
    },
    select: { id: true, startedAt: true, createdAt: true }
  })
  if (activeRuns.length === 0) return false

  const now = Date.now()
  let stillActive = false

  for (const run of activeRuns) {
    const referenceTime = (run.startedAt ?? run.createdAt).getTime()
    if (now - referenceTime > STRUCTURE_GENERATION_RUN_STALE_AFTER_MS) {
      await markStructureGenerationRunFailed(
        run.id,
        'Generation timed out before the task could report completion.'
      )
    } else {
      stillActive = true
    }
  }

  return stillActive
}

export async function supersedeActiveStructureGenerationRuns(
  plannedWorkoutId: string,
  tx?: import('@prisma/client').Prisma.TransactionClient
) {
  const client = tx || prisma
  await client.workoutStructureGenerationRun.updateMany({
    where: {
      plannedWorkoutId,
      status: { in: ACTIVE_STATUSES }
    },
    data: { status: 'SUPERSEDED', completedAt: new Date() }
  })
}
