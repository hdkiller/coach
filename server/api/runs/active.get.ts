import { requireAuth } from '../../utils/auth-guard'
import { listTaskRunsForUser } from '../../utils/task-dispatcher'

const ACTIVE_STATUSES = new Set([
  'EXECUTING',
  'QUEUED',
  'WAITING_FOR_DEPLOY',
  'REATTEMPTING',
  'FROZEN',
  'DELAYED'
])
const RECENT_THRESHOLD_MS = 60 * 1000

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  try {
    const taskRuns = await listTaskRunsForUser(user.id, 20)
    const now = Date.now()
    return taskRuns.filter((run) => {
      if (ACTIVE_STATUSES.has(run.status)) return true
      return Boolean(
        run.finishedAt && now - new Date(run.finishedAt).getTime() < RECENT_THRESHOLD_MS
      )
    })
  } catch (error) {
    console.error(`Failed to list active runs for user ${user.id}:`, error)
    throw createError({ statusCode: 500, message: 'Failed to retrieve active runs' })
  }
})
