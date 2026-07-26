import { prisma } from '../db'
import { getTaskRun } from '../task-dispatcher'

export type AsyncJobType = 'structure_generation' | 'report' | 'trigger_run' | 'workout_analysis'

export type AsyncJobStatus = {
  job_type: AsyncJobType
  job_id: string
  status: string
  completed: boolean
  failed: boolean
  error?: string | null
  result?: Record<string, unknown>
  started_at?: string | null
  completed_at?: string | null
}

export async function getAsyncJobStatus(
  userId: string,
  jobType: AsyncJobType,
  jobId: string
): Promise<AsyncJobStatus | null> {
  switch (jobType) {
    case 'structure_generation':
      return getStructureGenerationStatus(userId, jobId)
    case 'report':
      return getReportStatus(userId, jobId)
    case 'trigger_run':
      return getTriggerRunStatus(userId, jobId)
    case 'workout_analysis':
      return getWorkoutAnalysisStatus(userId, jobId)
    default:
      return null
  }
}

async function getStructureGenerationStatus(
  userId: string,
  runId: string
): Promise<AsyncJobStatus | null> {
  const run = await prisma.workoutStructureGenerationRun.findFirst({
    where: { id: runId, userId },
    select: {
      id: true,
      status: true,
      error: true,
      triggerRunId: true,
      plannedWorkoutId: true,
      mode: true,
      startedAt: true,
      completedAt: true
    }
  })

  if (!run) return null

  const completed = ['COMPLETED', 'FAILED', 'STALE', 'SUPERSEDED'].includes(run.status)
  const failed = run.status === 'FAILED' || run.status === 'STALE'

  return {
    job_type: 'structure_generation',
    job_id: run.id,
    status: run.status,
    completed,
    failed,
    error: run.error,
    started_at: run.startedAt?.toISOString() || null,
    completed_at: run.completedAt?.toISOString() || null,
    result: {
      planned_workout_id: run.plannedWorkoutId,
      mode: run.mode,
      trigger_run_id: run.triggerRunId
    }
  }
}

async function getReportStatus(userId: string, reportId: string): Promise<AsyncJobStatus | null> {
  const report = await prisma.report.findFirst({
    where: { id: reportId, userId },
    select: {
      id: true,
      status: true,
      type: true,
      markdown: true,
      createdAt: true,
      updatedAt: true
    }
  })

  if (!report) return null

  const completed = report.status === 'COMPLETED' || report.status === 'FAILED'
  const failed = report.status === 'FAILED'

  return {
    job_type: 'report',
    job_id: report.id,
    status: report.status,
    completed,
    failed,
    started_at: report.createdAt.toISOString(),
    completed_at: completed ? report.updatedAt.toISOString() : null,
    result:
      report.status === 'COMPLETED' && report.markdown
        ? { type: report.type, has_markdown: true }
        : { type: report.type }
  }
}

async function getWorkoutAnalysisStatus(
  userId: string,
  workoutId: string
): Promise<AsyncJobStatus | null> {
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, userId },
    select: {
      id: true,
      title: true,
      aiAnalysisStatus: true,
      aiAnalyzedAt: true,
      overallScore: true
    }
  })

  if (!workout) return null

  const status = workout.aiAnalysisStatus || 'NOT_STARTED'
  const completed = status === 'COMPLETED' || status === 'FAILED'
  const failed = status === 'FAILED'

  return {
    job_type: 'workout_analysis',
    job_id: workout.id,
    status,
    completed,
    failed,
    completed_at: workout.aiAnalyzedAt?.toISOString() || null,
    result: {
      workout_id: workout.id,
      title: workout.title,
      overall_score: workout.overallScore
    }
  }
}

async function getTriggerRunStatus(userId: string, runId: string): Promise<AsyncJobStatus> {
  try {
    const run = await getTaskRun(runId)
    if (!run || !run.tags.includes(`user:${userId}`)) {
      return {
        job_type: 'trigger_run',
        job_id: runId,
        status: 'NOT_FOUND',
        completed: false,
        failed: false
      }
    }
    const completed = ['COMPLETED', 'FAILED', 'CANCELED', 'TIMED_OUT', 'CRASHED'].includes(
      run.status
    )
    const failed = ['FAILED', 'TIMED_OUT', 'CRASHED'].includes(run.status)
    return {
      job_type: 'trigger_run',
      job_id: runId,
      status: run.status,
      completed,
      failed,
      error:
        run.error && typeof run.error === 'object' && 'message' in run.error
          ? String(run.error.message)
          : null,
      result: { trigger_run_id: runId, output: run.output }
    }
  } catch {
    return {
      job_type: 'trigger_run',
      job_id: runId,
      status: 'UNKNOWN',
      completed: false,
      failed: false,
      result: { trigger_run_id: runId }
    }
  }
}
