import { dispatchTask, isTaskRunningForUser } from './task-dispatcher'
import { shouldAutoDeduplicateWorkoutsAfterIngestion } from './ingestion-settings'

export async function triggerWorkoutDeduplicationIfEnabled(userId: string): Promise<boolean> {
  if (!(await shouldAutoDeduplicateWorkoutsAfterIngestion(userId))) {
    return false
  }

  const dedupAlreadyRunning = await isTaskRunningForUser('deduplicate-workouts', userId)
  if (dedupAlreadyRunning) {
    return false
  }

  await dispatchTask(
    'deduplicate-workouts',
    { userId, dryRun: false },
    {
      concurrencyKey: userId,
      tags: [`user:${userId}`]
    }
  )

  return true
}
