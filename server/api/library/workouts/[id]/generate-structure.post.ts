import { getServerSession } from '../../../../utils/session'
import { prisma } from '../../../../utils/db'
import {
  getLibraryAccessContext,
  getReadableLibraryOwnerIds,
  parseLibraryScope
} from '../../../../utils/library-access'
import { publishTaskRunStartedEvent } from '../../../../utils/task-run-events'
import { dispatchTask } from '../../../../utils/task-dispatcher'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const sessionUserId = session.user.id
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing workout template ID' })
  }

  const context = getLibraryAccessContext(session.user)
  const scope = parseLibraryScope(getQuery(event).scope, context.isCoaching ? 'all' : 'athlete')

  const template = await (prisma as any).workoutTemplate.findFirst({
    where: {
      id,
      userId: { in: getReadableLibraryOwnerIds(context, scope) }
    }
  })

  if (!template) {
    throw createError({ statusCode: 404, message: 'Workout template not found' })
  }

  const runTags = [
    `user:${sessionUserId}`,
    `workout-template:${id}`,
    `template-owner:${template.userId}`
  ]

  const handle = await dispatchTask(
    'generate-structured-workout',
    {
      workoutTemplateId: id
    },
    {
      tags: runTags,
      concurrencyKey: template.userId
    }
  )

  await publishTaskRunStartedEvent(sessionUserId, 'generate-structured-workout', handle, {
    tags: runTags
  })

  return {
    success: true,
    runId: handle.id
  }
})
