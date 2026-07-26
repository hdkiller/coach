import { requireAuth } from '../../utils/auth-guard'
import { getTaskStatus } from '../../utils/task-dispatcher'

defineRouteMeta({
  openAPI: {
    tags: ['Profile'],
    summary: 'Get profile generation status',
    description: 'Checks if profile generation tasks are currently running.',
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
                isRunning: { type: 'boolean' }
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
  const user = await requireAuth(event, ['profile:read'])

  const query = getQuery(event)
  const jobId = query.jobId as string

  if (jobId) {
    const status = await getTaskStatus('generate-athlete-profile', jobId, user.id)
    return {
      isRunning: status.isRunning
    }
  }

  return {
    isRunning: false
  }
})
