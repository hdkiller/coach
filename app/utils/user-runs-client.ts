export interface TriggerRun {
  id: string
  taskIdentifier: string
  status: string
  startedAt: string
  finishedAt?: string
  output?: any
  error?: any
  isTest?: boolean
  tags?: string[]
}

export const ACTIVE_STATUSES = [
  'EXECUTING',
  'QUEUED',
  'WAITING_FOR_DEPLOY',
  'REATTEMPTING',
  'FROZEN',
  'PENDING_VERSION',
  'DELAYED'
]

export const COMPLETED_RUN_TTL_MS = 5 * 60 * 1000

export function runBelongsToUser(run: TriggerRun, userId: string | null): boolean {
  if (!userId) return false
  if (!Array.isArray(run.tags) || run.tags.length === 0) return true
  return run.tags.includes(`user:${userId}`)
}

export function pruneRunsForCurrentUser(
  runsList: TriggerRun[],
  userId: string | null,
  now = Date.now()
): TriggerRun[] {
  return runsList
    .filter((run) => {
      if (!runBelongsToUser(run, userId)) return false
      if (ACTIVE_STATUSES.includes(run.status)) return true
      if (!run.finishedAt) return false
      return now - new Date(run.finishedAt).getTime() < COMPLETED_RUN_TTL_MS
    })
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 50)
}

export function mergeActiveRunsFromApi(
  existingRuns: TriggerRun[],
  apiRuns: TriggerRun[]
): TriggerRun[] {
  const mergedRunsMap = new Map<string, TriggerRun>()

  apiRuns.forEach((run) => {
    const existing = existingRuns.find((item) => item.id === run.id)

    if (existing) {
      const isLocalFinal = ['COMPLETED', 'FAILED', 'CANCELED', 'TIMED_OUT'].includes(
        existing.status
      )
      const isApiFinal = ['COMPLETED', 'FAILED', 'CANCELED', 'TIMED_OUT'].includes(run.status)

      if (isLocalFinal && !isApiFinal) {
        mergedRunsMap.set(run.id, { ...run, ...existing, status: existing.status })
      } else {
        mergedRunsMap.set(run.id, { ...existing, ...run })
      }
    } else {
      mergedRunsMap.set(run.id, run)
    }
  })

  return Array.from(mergedRunsMap.values())
}
