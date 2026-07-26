import { requireAuth } from '../../utils/auth-guard'
import { getTaskRun } from '../../utils/task-dispatcher'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['plan:read'])

  const { jobId } = getQuery(event)

  if (!jobId || typeof jobId !== 'string') {
    throw createError({ statusCode: 400, message: 'Job ID is required' })
  }

  try {
    const run = await getTaskRun(jobId)
    if (!run || !run.tags.includes(`user:${user.id}`)) {
      throw createError({ statusCode: 404, message: 'Job not found' })
    }
    return {
      status: run.status,
      completed: ['COMPLETED', 'SUCCESS', 'FAILURE', 'CANCELED', 'TIMED_OUT', 'ABORTED'].includes(
        run.status
      ),
      output: run.output
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    throw createError({ statusCode: 500, message: 'Failed to fetch job status' })
  }
})
