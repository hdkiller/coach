import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import { z } from 'zod'
import {
  annotateLibraryOwner,
  getLibraryAccessContext,
  getWritableLibraryOwnerId,
  parseLibraryScope
} from '../../../utils/library-access'

const saveTemplateSchema = z.object({
  plannedWorkoutId: z.string().optional(),
  workoutId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  ownerScope: z.enum(['athlete', 'coach']).optional()
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const context = getLibraryAccessContext(session.user)
  const userId = context.effectiveUserId
  const body = await readBody(event)

  const validation = saveTemplateSchema.safeParse(body)
  if (!validation.success) {
    throw createError({ statusCode: 400, message: validation.error.message })
  }

  const { plannedWorkoutId, workoutId, title, description, category, tags, ownerScope } =
    validation.data
  const ownerUserId = getWritableLibraryOwnerId(context, parseLibraryScope(ownerScope, 'coach'))

  let sourceData: any = null

  if (plannedWorkoutId) {
    const planned = await prisma.plannedWorkout.findUnique({
      where: { id: plannedWorkoutId, userId }
    })
    if (!planned) throw createError({ statusCode: 404, message: 'Planned workout not found' })

    sourceData = {
      title: title || planned.title,
      description: description || planned.description,
      type: planned.type,
      durationSec: planned.durationSec,
      tss: planned.tss,
      workIntensity: planned.workIntensity,
      structuredWorkout: planned.structuredWorkout,
      category: category || planned.category
    }
  } else if (workoutId) {
    const completed = await prisma.workout.findUnique({
      where: { id: workoutId, userId },
      include: { plannedWorkout: true }
    })
    if (!completed) throw createError({ statusCode: 404, message: 'Workout not found' })

    // If it has a planned workout, use its structure as it's cleaner
    // Otherwise we'd need to reconstruct structure from streams (future feature)
    sourceData = {
      title: title || completed.title,
      description: description || completed.description,
      type: completed.type,
      durationSec: completed.durationSec,
      tss: completed.tss,
      workIntensity: completed.intensity,
      structuredWorkout: completed.plannedWorkout?.structuredWorkout || null,
      category: category
    }
  } else {
    throw createError({
      statusCode: 400,
      message: 'Either plannedWorkoutId or workoutId is required'
    })
  }

  if (!sourceData.structuredWorkout) {
    // We could potentially still save it as a "Text Only" template,
    // but the objective mentioned structure specifically.
    // For now we allow it but it's less useful.
  }

  return await prisma.$transaction(async (tx) => {
    const template = await (tx as any).workoutTemplate.create({
      data: {
        userId: ownerUserId,
        title: sourceData.title,
        description: sourceData.description,
        type: sourceData.type || 'Ride',
        category: sourceData.category,
        durationSec: sourceData.durationSec || 0,
        tss: sourceData.tss,
        workIntensity: sourceData.workIntensity,
        structuredWorkout: sourceData.structuredWorkout,
        tags: tags || []
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            parentId: true
          }
        }
      }
    })

    return {
      success: true,
      templateId: template.id,
      template: annotateLibraryOwner(context, template)
    }
  })
})
