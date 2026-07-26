import { tasks } from '@trigger.dev/sdk/v3'

/** Trigger runs older than this are treated as stale and ignored for sync guards. */
export const STALE_TRIGGER_RUN_MS = 2 * 60 * 60 * 1000

function getRunTimestamp(run: {
  startedAt?: string | Date | null
  createdAt?: string | Date | null
}) {
  return run.startedAt || run.createdAt || null
}

export function isRunFresh(
  run: { startedAt?: string | Date | null; createdAt?: string | Date | null },
  nowMs = Date.now(),
  maxAgeMs = STALE_TRIGGER_RUN_MS
): boolean {
  const timestamp = getRunTimestamp(run)
  if (!timestamp) return true
  return nowMs - new Date(timestamp).getTime() <= maxAgeMs
}

export async function safeTriggerTask(
  taskIdentifier: string,
  payload: any,
  options?: any
): Promise<{ id: string }> {
  return tasks.trigger(taskIdentifier, payload, options)
}
