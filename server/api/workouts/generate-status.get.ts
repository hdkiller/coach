import { requireAuth } from '../../utils/auth-guard'
import { getTaskStatus, isTaskRunningForUser } from '../../utils/task-dispatcher'

defineRouteMeta({
  openAPI: {
    tags: ['Workouts'],
    summary: 'Ad-hoc workout generation status',
    description: 'Returns whether an ad-hoc workout generation job is still running.',
    inputSchema: [
      {
        in: 'query',
        name: 'jobId',
        schema: { type: 'string' },
        description: 'Specific Job ID to check'
      }
    ],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                isRunning: { type: 'boolean' },
                task: { type: 'string', nullable: true }
              }
            }
          }
        }
      },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['workout:write'])
  const query = getQuery(event)
  const jobId = typeof query.jobId === 'string' ? query.jobId : undefined

  if (jobId) {
    const status = await getTaskStatus('generate-ad-hoc-workout', jobId, user.id)
    return {
      isRunning: status.isRunning,
      task: status.isRunning ? 'generate-ad-hoc-workout' : null
    }
  }

  const isRunning = await isTaskRunningForUser('generate-ad-hoc-workout', user.id)
  return {
    isRunning,
    task: isRunning ? 'generate-ad-hoc-workout' : null
  }
})
