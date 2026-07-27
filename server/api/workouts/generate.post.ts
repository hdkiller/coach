import { z } from 'zod'
import { requireAuth } from '../../utils/auth-guard'
import { checkQuota } from '../../utils/quotas/engine'
import { publishTaskRunStartedEvent } from '../../utils/task-run-events'
import { dispatchTask } from '../../utils/task-dispatcher'

defineRouteMeta({
  openAPI: {
    tags: ['Workouts'],
    summary: 'Generate ad-hoc workout',
    description: 'Triggers AI generation of a planned workout for today.',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                jobId: { type: 'string' },
                message: { type: 'string' }
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
  const userId = user.id

  const body = await readBody(event)
  const { type, durationMinutes, intensity, notes } = body ?? {}

  // 0. Quota Check
  try {
    await checkQuota(userId, 'generate_structured_workout')
  } catch (error: any) {
    if (error.statusCode === 429) {
      throw createError({
        statusCode: 429,
        message: error.message || 'Quota exceeded for workout generation.'
      })
    }
    throw error
  }

  const now = new Date()

  const handle = await dispatchTask(
    'generate-ad-hoc-workout',
    {
      userId,
      date: now,
      preferences: {
        type,
        durationMinutes,
        intensity,
        notes
      }
    },
    {
      tags: [`user:${userId}`]
    }
  )

  await publishTaskRunStartedEvent(userId, 'generate-ad-hoc-workout', handle)

  return {
    success: true,
    jobId: handle.id,
    message: 'Generating workout...'
  }
})
