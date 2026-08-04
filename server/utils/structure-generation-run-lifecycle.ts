import {
  isStructureGenerationRunCurrent,
  markStructureGenerationRunCompleted,
  markStructureGenerationRunFailed,
  markStructureGenerationRunRunning,
  markStructureGenerationRunStale
} from './structure-generation-run'

type GenerationTaskPayload = {
  generationRunId?: string
  generationRevision?: number
}

export type StructureGenerationTaskResult = {
  success?: boolean
  stale?: boolean
  skipped?: boolean
  error?: string
  reason?: string
  message?: string
}

export async function startStructureGenerationTask(
  payload: GenerationTaskPayload,
  triggerRunId?: string
): Promise<{ stale: boolean }> {
  if (!payload.generationRunId) return { stale: false }

  const current = await isStructureGenerationRunCurrent(payload.generationRunId)
  if (!current) {
    await markStructureGenerationRunStale(payload.generationRunId)
    return { stale: true }
  }

  await markStructureGenerationRunRunning(payload.generationRunId, triggerRunId)
  return { stale: false }
}

export async function finishStructureGenerationTask(
  payload: GenerationTaskPayload,
  outcome: StructureGenerationTaskResult
) {
  if (!payload.generationRunId) return
  if (outcome.stale) {
    await markStructureGenerationRunStale(payload.generationRunId)
    return
  }
  if (outcome.success) {
    await markStructureGenerationRunCompleted(payload.generationRunId)
    return
  }
  const failureMessage =
    outcome.error ||
    outcome.message ||
    (outcome.reason ? String(outcome.reason) : null) ||
    (outcome.skipped ? 'Generation skipped' : 'Generation failed')
  await markStructureGenerationRunFailed(payload.generationRunId, failureMessage)
}

export async function failStructureGenerationTaskFromPayload(payload: unknown, error: unknown) {
  const runId = (payload as GenerationTaskPayload | null)?.generationRunId
  if (!runId) return
  const message = error instanceof Error ? error.message : String(error || 'Generation failed')
  await markStructureGenerationRunFailed(runId, message)
}
