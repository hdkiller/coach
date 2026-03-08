import { tasks } from '@trigger.dev/sdk/v3'
import { getServerSession } from '../../utils/session'
import { trainingBlockRepository } from '../../utils/repositories/trainingBlockRepository'
import { checkQuota } from '../../utils/quotas/engine'
import { publishTaskRunStartedEvent } from '../../utils/task-run-events'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const { blockId } = await readBody(event)
  const userId = (session.user as any).id

  // 0. Check Quota
  try {
    await checkQuota(userId, 'weekly_plan_generation')
  } catch (error: any) {
    if (error.statusCode === 429) {
      throw createError({
        statusCode: 429,
        message: error.message || 'Quota exceeded for weekly plan generation.'
      })
    }
    throw error
  }

  if (!blockId) {
    throw createError({ statusCode: 400, message: 'Block ID is required' })
  }

  // Verify ownership
  const block = await trainingBlockRepository.getById(blockId, {
    include: { plan: { select: { userId: true } } }
  })

  if (!block || (block.plan as any).userId !== userId) {
    throw createError({ statusCode: 404, message: 'Block not found' })
  }

  const handle = await tasks.trigger(
    'generate-training-block',
    {
      userId,
      blockId: blockId
    },
    {
      tags: [`user:${userId}`]
    }
  )

  await publishTaskRunStartedEvent(userId, 'generate-training-block', handle)

  return {
    success: true,
    jobId: handle.id
  }
})
