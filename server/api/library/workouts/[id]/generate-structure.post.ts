import { tasks } from '@trigger.dev/sdk/v3'
import { getServerSession } from '../../../../utils/session'
import { prisma } from '../../../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing workout template ID' })
  }

  const template = await (prisma as any).workoutTemplate.findUnique({
    where: {
      id,
      userId: session.user.id
    }
  })

  if (!template) {
    throw createError({ statusCode: 404, message: 'Workout template not found' })
  }

  const handle = await tasks.trigger(
    'generate-structured-workout',
    {
      workoutTemplateId: id
    },
    {
      tags: [`user:${session.user.id}`, `workout-template:${id}`],
      concurrencyKey: session.user.id
    }
  )

  return {
    success: true,
    runId: handle.id
  }
})
