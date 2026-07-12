import { streamsQueue } from './queue'

export type IntervalsStreamJobData = {
  provider: 'intervals-stream'
  userId: string
  workoutId: string
  activityId: string
}

export function intervalsStreamJobId(activityId: string) {
  return `intervals-stream:${activityId}`
}

export async function enqueueIntervalsStreamSync(input: {
  userId: string
  workoutId: string
  activityId: string
}) {
  const jobId = intervalsStreamJobId(input.activityId)
  const existing = await streamsQueue.getJob(jobId)

  if (existing) {
    const state = await existing.getState()
    if (state === 'waiting' || state === 'delayed' || state === 'active' || state === 'paused') {
      return
    }
  }

  await streamsQueue.add(
    'intervals-stream-sync',
    {
      provider: 'intervals-stream',
      userId: input.userId,
      workoutId: input.workoutId,
      activityId: input.activityId
    } satisfies IntervalsStreamJobData,
    { jobId }
  )
}
