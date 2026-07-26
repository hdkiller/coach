import { z } from 'zod/v3'
import { getServerSession } from '../../../../utils/session'
import { prisma } from '../../../../utils/db'
import {
  getLibraryAccessContext,
  getReadableLibraryOwnerIds,
  parseLibraryScope
} from '../../../../utils/library-access'
import { structureGenerationRunTags } from '../../../../utils/trigger-run-tags'
import { dispatchTask } from '../../../../utils/task-dispatcher'

const adjustSchema = z.object({
  durationMinutes: z.number().optional(),
  intensity: z.string().optional(),
  feedback: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing workout template ID' })
  }

  const body = await readBody(event)
  const adjustments = adjustSchema.parse(body)
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
    workoutTemplateId: template.id,
    source: 'library'
  })
  const handle = await dispatchTask(
    'adjust-structured-workout',
    {
      workoutTemplateId: template.id,
      adjustments
    },
    {
      concurrencyKey: template.userId,
      tags
    }
  )

  return { success: true, jobId: handle.id }
})
