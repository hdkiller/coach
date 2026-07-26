import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  enqueuePlannedWorkoutStructureGeneration,
  enqueuePlannedWorkoutStructureAdjustment
} from '../../../../server/utils/planned-workout-structure-trigger'
import {
  beginStructureGenerationRun,
  attachTriggerRunId,
  markStructureGenerationRunFailed
} from '../../../../server/utils/structure-generation-run'
import { publishTaskRunStartedEvent } from '../../../../server/utils/task-run-events'
import { dispatchTask } from '../../../../server/utils/task-dispatcher'

vi.mock('../../../../server/utils/structure-generation-run', () => ({
  beginStructureGenerationRun: vi.fn(),
  attachTriggerRunId: vi.fn(),
  markStructureGenerationRunFailed: vi.fn()
}))

vi.mock('../../../../server/utils/task-dispatcher', () => ({
  dispatchTask: vi.fn()
}))

vi.mock('../../../../server/utils/task-run-events', () => ({
  publishTaskRunStartedEvent: vi.fn()
}))

describe('planned workout structure trigger enqueue failures', () => {
  const generation = {
    runId: 'db-run-1',
    generationRevision: 3,
    idempotencyKey: 'structure-generate:pw-1:rev-3'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(beginStructureGenerationRun).mockResolvedValue(generation)
    vi.mocked(dispatchTask).mockImplementation(async (taskId) => ({
      id: taskId === 'adjust-structured-workout' ? 'trigger-run-2' : 'trigger-run-1'
    }))
    vi.mocked(attachTriggerRunId).mockResolvedValue(undefined)
    vi.mocked(publishTaskRunStartedEvent).mockResolvedValue(undefined)
  })

  it('marks the database run failed when trigger rejection happens after begin', async () => {
    vi.mocked(dispatchTask).mockRejectedValue(new Error('Trigger rejected'))

    const result = await enqueuePlannedWorkoutStructureGeneration({
      userId: 'user-1',
      plannedWorkoutId: 'pw-1',
      source: 'api'
    })

    expect(result).toEqual({ status: 'failed', error: 'Trigger rejected' })
    expect(markStructureGenerationRunFailed).toHaveBeenCalledWith('db-run-1', 'Trigger rejected')
    expect(attachTriggerRunId).not.toHaveBeenCalled()
  })

  it('marks the database run failed when trigger id attachment fails', async () => {
    vi.mocked(attachTriggerRunId).mockRejectedValue(new Error('Attach failed'))

    const result = await enqueuePlannedWorkoutStructureGeneration({
      userId: 'user-1',
      plannedWorkoutId: 'pw-1',
      source: 'api'
    })

    expect(result).toEqual({ status: 'failed', error: 'Attach failed' })
    expect(markStructureGenerationRunFailed).toHaveBeenCalledWith('db-run-1', 'Attach failed')
    expect(dispatchTask).toHaveBeenCalledWith(
      'generate-structured-workout',
      expect.any(Object),
      expect.any(Object)
    )
  })

  it('keeps the database run active when only start-event publication fails', async () => {
    vi.mocked(publishTaskRunStartedEvent).mockRejectedValue(new Error('Event bus down'))

    const result = await enqueuePlannedWorkoutStructureGeneration({
      userId: 'user-1',
      plannedWorkoutId: 'pw-1',
      source: 'api'
    })

    expect(result.status).toBe('queued')
    expect(markStructureGenerationRunFailed).not.toHaveBeenCalled()
    expect(attachTriggerRunId).toHaveBeenCalledWith('db-run-1', 'trigger-run-1')
  })

  it('marks adjustment runs failed when enqueue fails', async () => {
    vi.mocked(dispatchTask).mockRejectedValue(new Error('Adjust trigger failed'))

    const result = await enqueuePlannedWorkoutStructureAdjustment({
      userId: 'user-1',
      plannedWorkoutId: 'pw-1',
      adjustments: { feedback: 'easier' },
      source: 'api'
    })

    expect(result).toEqual({ status: 'failed', error: 'Adjust trigger failed' })
    expect(markStructureGenerationRunFailed).toHaveBeenCalledWith(
      'db-run-1',
      'Adjust trigger failed'
    )
  })
})
