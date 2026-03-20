import { requireAuth } from '../../../utils/auth-guard'
import { nutritionRepository } from '../../../utils/repositories/nutritionRepository'
import { tasks } from '@trigger.dev/sdk/v3'
import { assertQuotaAllowed } from '../../../utils/quotas/http'
import { publishTaskRunStartedEvent } from '../../../utils/task-run-events'

defineRouteMeta({
  openAPI: {
    tags: ['Nutrition'],
    summary: 'Analyze nutrition',
    description: 'Triggers AI analysis for a specific nutrition record.',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'UUID or Date (YYYY-MM-DD)'
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
                success: { type: 'boolean' },
                nutritionId: { type: 'string' },
                jobId: { type: 'string' },
                status: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      },
      401: { description: 'Unauthorized' },
      404: { description: 'Nutrition record not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['nutrition:write'])
  const userId = user.id

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Nutrition ID or Date is required'
    })
  }

  await assertQuotaAllowed(userId, 'nutrition_analysis')

  let nutrition: any = null

  // Check if ID is a date string (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(id)) {
    const dateObj = new Date(`${id}T00:00:00Z`)
    if (!isNaN(dateObj.getTime())) {
      nutrition = await nutritionRepository.getByDate(userId, dateObj)
    }
  }

  // Fallback to searching by UUID if not found by date or if not a date string
  if (!nutrition) {
    nutrition = await nutritionRepository.getById(id, userId)
  }

  if (!nutrition) {
    throw createError({
      statusCode: 404,
      message: 'Nutrition record not found'
    })
  }

  const nutritionId = nutrition.id

  // Allow re-analysis regardless of existing data
  if (nutrition.aiAnalysisStatus === 'COMPLETED' && nutrition.aiAnalysisJson) {
    console.log('Re-analyzing nutrition even though analysis exists')
  }

  // Check if already processing
  if (nutrition.aiAnalysisStatus === 'PROCESSING') {
    return {
      success: true,
      nutritionId,
      status: 'PROCESSING',
      message: 'Analysis is currently being generated'
    }
  }

  try {
    // Update status to PENDING
    await nutritionRepository.updateStatus(nutritionId, 'PENDING')

    // Trigger background job with per-user concurrency
    const handle = await tasks.trigger(
      'analyze-nutrition',
      {
        nutritionId
      },
      {
        concurrencyKey: userId,
        tags: [`user:${userId}`],
        idempotencyKey: nutritionId,
        idempotencyKeyTTL: '5m'
      }
    )

    await publishTaskRunStartedEvent(userId, 'analyze-nutrition', handle)

    return {
      success: true,
      nutritionId,
      jobId: handle.id,
      status: 'PENDING',
      message: 'Nutrition analysis started'
    }
  } catch (error) {
    // Update status to failed
    await nutritionRepository.updateStatus(nutritionId, 'FAILED')

    throw createError({
      statusCode: 500,
      message: `Failed to trigger nutrition analysis: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
})
