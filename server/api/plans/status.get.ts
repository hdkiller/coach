import { runs } from '@trigger.dev/sdk/v3'
import { requireAuth } from '../../utils/auth-guard'

export default defineEventHandler(async (event) => {
  await requireAuth(event, ['plan:read'])

  const { jobId } = getQuery(event)

  if (!jobId || typeof jobId !== 'string') {
    throw createError({ statusCode: 400, message: 'Job ID is required' })
  }

  try {
    const run = await runs.retrieve(jobId)
    return {
      status: run.status,
      completed: ['COMPLETED', 'SUCCESS', 'FAILURE', 'CANCELED', 'TIMED_OUT', 'ABORTED'].includes(
        run.status
      ),
      output: run.output
    }
  } catch (error) {
    throw createError({ statusCode: 500, message: 'Failed to fetch job status' })
  }
})
