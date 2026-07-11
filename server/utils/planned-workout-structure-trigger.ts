import { generateStructuredWorkoutTask } from '../../trigger/generate-structured-workout'
import { adjustStructuredWorkoutTask } from '../../trigger/adjust-structured-workout'
import { publishTaskRunStartedEvent } from './task-run-events'
import { structureGenerationRunTags, type StructureRunSource } from './trigger-run-tags'
import type { WorkoutTargetingOverride } from '../../trigger/utils/workout-targeting'
import type { StructuredWorkoutGeneratorMode } from './structured-workout-generator'
import {
  beginStructureGenerationRun,
  attachTriggerRunId,
  markStructureGenerationRunFailed
} from './structure-generation-run'

export type StructureGenerationStatus = 'queued' | 'skipped' | 'failed' | 'exists'

export type StructureEnqueueResult =
  | { status: 'queued'; runId: string; generationRunId: string; generationRevision: number }
  | { status: 'failed'; error: string }

function formatTriggerError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'Failed to start structure generation'
}

async function markEnqueueRunFailed(runId: string | null, error: unknown) {
  if (!runId) return
  try {
    await markStructureGenerationRunFailed(runId, formatTriggerError(error))
  } catch (markError) {
    console.error('Failed to mark structure generation run failed:', markError)
  }
}

export async function enqueuePlannedWorkoutStructureGeneration(options: {
  userId: string
  plannedWorkoutId: string
  targetingOverride?: WorkoutTargetingOverride | null
  generatorOverride?: StructuredWorkoutGeneratorMode | null
  source?: StructureRunSource
  quotaCheckedAtEnqueue?: boolean
}): Promise<StructureEnqueueResult> {
  const {
    userId,
    plannedWorkoutId,
    targetingOverride = null,
    generatorOverride = null,
    source = 'chat',
    quotaCheckedAtEnqueue = false
  } = options

  let generationRunId: string | null = null
  try {
    const generation = await beginStructureGenerationRun({
      plannedWorkoutId,
      userId,
      mode: 'generate',
      source,
      requestSnapshot: {
        targetingOverride,
        generatorOverride,
        quotaCheckedAtEnqueue
      }
    })
    generationRunId = generation.runId
    const tags = structureGenerationRunTags({
      userId,
      plannedWorkoutId,
      source
    })
    const handle = await generateStructuredWorkoutTask.trigger(
      {
        plannedWorkoutId,
        targetingOverride,
        generatorOverride,
        generationRevision: generation.generationRevision,
        generationRunId: generation.runId,
        quotaCheckedAtEnqueue
      },
      {
        tags,
        concurrencyKey: userId,
        idempotencyKey: generation.idempotencyKey
      }
    )
    try {
      await attachTriggerRunId(generation.runId, handle.id)
    } catch (attachError) {
      await markEnqueueRunFailed(generationRunId, attachError)
      throw attachError
    }
    try {
      await publishTaskRunStartedEvent(userId, 'generate-structured-workout', handle, { tags })
    } catch (eventError) {
      // The Trigger task is already running; do not mark the DB run failed.
      console.error('Failed to publish structure generation started event:', eventError)
    }
    return {
      status: 'queued',
      runId: handle.id,
      generationRunId: generation.runId,
      generationRevision: generation.generationRevision
    }
  } catch (error) {
    await markEnqueueRunFailed(generationRunId, error)
    console.error('Failed to trigger structured workout generation:', error)
    return { status: 'failed', error: formatTriggerError(error) }
  }
}

export async function enqueuePlannedWorkoutStructureAdjustment(options: {
  userId: string
  plannedWorkoutId: string
  adjustments: Record<string, unknown>
  targetingOverride?: WorkoutTargetingOverride | null
  source?: StructureRunSource
  quotaCheckedAtEnqueue?: boolean
}): Promise<StructureEnqueueResult> {
  const {
    userId,
    plannedWorkoutId,
    adjustments,
    targetingOverride = null,
    source = 'api',
    quotaCheckedAtEnqueue = false
  } = options

  let generationRunId: string | null = null
  try {
    const generation = await beginStructureGenerationRun({
      plannedWorkoutId,
      userId,
      mode: 'adjust',
      source,
      requestSnapshot: {
        adjustments,
        targetingOverride,
        quotaCheckedAtEnqueue
      }
    })
    generationRunId = generation.runId
    const tags = structureGenerationRunTags({
      userId,
      plannedWorkoutId,
      source
    })
    const handle = await adjustStructuredWorkoutTask.trigger(
      {
        plannedWorkoutId,
        adjustments,
        targetingOverride,
        generationRevision: generation.generationRevision,
        generationRunId: generation.runId,
        quotaCheckedAtEnqueue
      },
      {
        tags,
        concurrencyKey: userId,
        idempotencyKey: generation.idempotencyKey
      }
    )
    try {
      await attachTriggerRunId(generation.runId, handle.id)
    } catch (attachError) {
      await markEnqueueRunFailed(generationRunId, attachError)
      throw attachError
    }
    try {
      await publishTaskRunStartedEvent(userId, 'adjust-structured-workout', handle, { tags })
    } catch (eventError) {
      console.error('Failed to publish structure adjustment started event:', eventError)
    }
    return {
      status: 'queued',
      runId: handle.id,
      generationRunId: generation.runId,
      generationRevision: generation.generationRevision
    }
  } catch (error) {
    await markEnqueueRunFailed(generationRunId, error)
    console.error('Failed to trigger structured workout adjustment:', error)
    return { status: 'failed', error: formatTriggerError(error) }
  }
}

export function buildStructureGenerationMessage(options: {
  outcome: 'created' | 'already_exists'
  requested: boolean
  status: StructureGenerationStatus
}): string {
  const { outcome, requested, status } = options

  if (!requested) {
    return outcome === 'created' ? 'Planned workout created.' : 'Planned workout already exists.'
  }

  if (status === 'queued') {
    return outcome === 'created'
      ? 'Planned workout created and structured generation started.'
      : 'Planned workout already exists; structure generation started.'
  }

  if (status === 'exists') {
    return outcome === 'created'
      ? 'Planned workout created with existing structure.'
      : 'Planned workout already exists with structure.'
  }

  if (status === 'failed') {
    return outcome === 'created'
      ? 'Planned workout created, but structure generation failed to start.'
      : 'Planned workout already exists, but structure generation failed to start.'
  }

  return outcome === 'created' ? 'Planned workout created.' : 'Planned workout already exists.'
}
