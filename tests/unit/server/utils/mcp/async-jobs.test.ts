import { describe, expect, it, vi } from 'vitest'

import { getAsyncJobStatus } from '../../../../../server/utils/mcp/async-jobs'

vi.mock('../../../../../server/utils/task-dispatcher', () => ({
  getTaskRun: vi.fn(async () => null)
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    workoutStructureGenerationRun: {
      findFirst: vi.fn(async () => ({
        id: 'run-1',
        status: 'COMPLETED',
        error: null,
        triggerRunId: 'trigger-1',
        plannedWorkoutId: 'pw-1',
        mode: 'generate',
        startedAt: new Date('2026-01-01T00:00:00Z'),
        completedAt: new Date('2026-01-01T00:05:00Z')
      }))
    },
    report: {
      findFirst: vi.fn(async () => null)
    },
    workout: {
      findFirst: vi.fn(async () => ({
        id: 'workout-1',
        title: 'Test Ride',
        aiAnalysisStatus: 'COMPLETED',
        aiAnalyzedAt: new Date('2026-01-01T00:10:00Z'),
        overallScore: 8
      }))
    }
  }
}))

describe('mcp/async-jobs', () => {
  it('returns structure generation status for owned runs', async () => {
    const status = await getAsyncJobStatus('user-1', 'structure_generation', 'run-1')
    expect(status).toMatchObject({
      job_type: 'structure_generation',
      job_id: 'run-1',
      status: 'COMPLETED',
      completed: true,
      failed: false
    })
  })

  it('returns workout analysis status for owned workouts', async () => {
    const status = await getAsyncJobStatus('user-1', 'workout_analysis', 'workout-1')
    expect(status).toMatchObject({
      job_type: 'workout_analysis',
      job_id: 'workout-1',
      status: 'COMPLETED',
      completed: true,
      failed: false
    })
  })
})
