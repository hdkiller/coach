import { tasks } from '@trigger.dev/sdk/v3'
import { requireAuth } from '../../utils/auth-guard'
import { trainingPlanRepository } from '../../utils/repositories/trainingPlanRepository'
import { publishTaskRunStartedEvent } from '../../utils/task-run-events'

export default defineEventHandler(async (event) => {
  const authUser = await requireAuth(event, ['plan:write'])

  const { planId, adaptationType } = await readBody(event)
  const userId = authUser.id

  if (!planId || !adaptationType) {
    throw createError({ statusCode: 400, message: 'Plan ID and Adaptation Type are required' })
  }

  // Verify ownership
  const plan = await trainingPlanRepository.getById(planId, userId)

  if (!plan) {
    throw createError({ statusCode: 404, message: 'Plan not found' })
  }

  const handle = await tasks.trigger(
    'adapt-training-plan',
    {
      userId,
      planId: planId,
      adaptationType
    },
    {
      tags: [`user:${userId}`]
    }
  )

  await publishTaskRunStartedEvent(userId, 'adapt-training-plan', handle)

  return {
    success: true,
    jobId: handle.id
  }
})
