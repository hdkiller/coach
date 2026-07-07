import { tasks } from '@trigger.dev/sdk/v3'
import { getServerSession } from '../../../../utils/session'
import { prisma } from '../../../../utils/db'
import {
  getLibraryAccessContext,
  getReadableLibraryOwnerIds,
  parseLibraryScope
} from '../../../../utils/library-access'
import { structureGenerationRunTags } from '../../../../utils/trigger-run-tags'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

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

  const tags = structureGenerationRunTags({
    userId: template.userId,
    workoutTemplateId: id,
    source: 'library'
  })
  const handle = await tasks.trigger(
    'generate-structured-workout',
    {
      workoutTemplateId: id
    },
    {
      tags,
      concurrencyKey: template.userId
    }
  )

  return {
    success: true,
    runId: handle.id
  }
})
