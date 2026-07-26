import { prisma } from './db'
import { dispatchTask } from './task-dispatcher'
import { auditLogRepository } from './repositories/auditLogRepository'
import { isWorkoutEligibleForAutomaticInsights } from './automatic-workout-insights'

type AnalysisSource = 'AUTOMATIC' | 'MANUAL'

export type WorkoutAnalysisEnqueueResult = {
  queued: boolean
  status: string
  runId?: string
}

export async function enqueueWorkoutAnalysis(input: {
  workoutId: string
  userId: string
  currentStatus: string | null
  source: AnalysisSource
  allowReanalysis?: boolean
}): Promise<WorkoutAnalysisEnqueueResult> {
  const currentStatus = input.currentStatus || 'NOT_STARTED'

  if (currentStatus === 'PENDING' || currentStatus === 'PROCESSING') {
    return { queued: false, status: currentStatus }
  }

  if (!input.allowReanalysis && currentStatus !== 'NOT_STARTED' && currentStatus !== 'FAILED') {
    return { queued: false, status: currentStatus }
  }

  const claimed = await prisma.workout.updateMany({
    where: {
      id: input.workoutId,
      userId: input.userId,
      aiAnalysisStatus: input.currentStatus
    },
    data: { aiAnalysisStatus: 'PENDING' }
  })

  if (claimed.count === 0) {
    const latest = await prisma.workout.findFirst({
      where: { id: input.workoutId, userId: input.userId },
      select: { aiAnalysisStatus: true }
    })
    return { queued: false, status: latest?.aiAnalysisStatus || currentStatus }
  }

  try {
    const handle = await dispatchTask(
      'analyze-workout',
      { workoutId: input.workoutId, source: input.source },
      {
        tags: [`user:${input.userId}`, `workout:${input.workoutId}`],
        concurrencyKey: input.userId,
        id: `workout-analysis-${input.workoutId}-${input.source.toLowerCase()}`
      }
    )

    return { queued: true, status: 'PENDING', runId: handle.id }
  } catch (error) {
    await prisma.workout.updateMany({
      where: {
        id: input.workoutId,
        userId: input.userId,
        aiAnalysisStatus: 'PENDING'
      },
      data: { aiAnalysisStatus: input.currentStatus || 'NOT_STARTED' }
    })
    throw error
  }
}

export async function enqueueAutomaticWorkoutAnalysesForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiAutoAnalyzeWorkouts: true }
  })

  if (!user?.aiAutoAnalyzeWorkouts) return { enabled: false, queued: 0 }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const candidates = await prisma.workout.findMany({
    where: {
      userId,
      date: { gte: thirtyDaysAgo },
      isDuplicate: false,
      OR: [
        { aiAnalysisStatus: null },
        { aiAnalysisStatus: 'NOT_STARTED' },
        { aiAnalysisStatus: 'FAILED' }
      ]
    },
    select: { id: true, title: true, date: true, type: true, aiAnalysisStatus: true }
  })

  let queued = 0
  for (const workout of candidates) {
    if (!isWorkoutEligibleForAutomaticInsights(workout.type)) continue

    const result = await enqueueWorkoutAnalysis({
      workoutId: workout.id,
      userId,
      currentStatus: workout.aiAnalysisStatus,
      source: 'AUTOMATIC'
    })

    if (!result.queued) continue
    queued++
    await auditLogRepository.log({
      userId,
      action: 'AUTO_ANALYZE_WORKOUT',
      resourceType: 'Workout',
      resourceId: workout.id,
      metadata: { title: workout.title, date: workout.date.toISOString() }
    })
  }

  return { enabled: true, queued }
}
