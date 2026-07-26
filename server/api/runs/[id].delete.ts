import { requireAuth } from '../../utils/auth-guard'
import { cancelTaskRun, getTaskRun } from '../../utils/task-dispatcher'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const runId = getRouterParam(event, 'id')
  if (!runId) {
    throw createError({ statusCode: 400, message: 'Missing run ID' })
  }

  try {
    const run = await getTaskRun(runId)
    if (!run) throw createError({ statusCode: 404, message: 'Run not found' })

    // Security check: Ensure the run belongs to the user via tags
    const hasUserTag = run.tags.includes(`user:${user.id}`)

    if (!hasUserTag) {
      throw createError({ statusCode: 404, message: 'Run not found' })
    }

    const result = await cancelTaskRun(runId)
    if (!result.canceled) {
      throw createError({
        statusCode: result.reason === 'NOT_FOUND' ? 404 : 409,
        message:
          result.reason === 'ALREADY_RUNNING'
            ? 'Redis tasks cannot be canceled after execution has started'
            : 'Run cannot be canceled'
      })
    }

    return { success: true }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error(`Failed to cancel run ${runId}:`, error)
    throw createError({ statusCode: 500, message: 'Failed to cancel run' })
  }
})
