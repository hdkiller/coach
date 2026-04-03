import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import {
  computeStructuredWorkoutDurationSec,
  computeStrengthExerciseMetrics
} from '../../../utils/structured-workout-persistence'
import { z } from 'zod'
import {
  annotateLibraryOwner,
  getLibraryAccessContext,
  getReadableLibraryOwnerIds,
  parseLibraryScope
} from '../../../utils/library-access'
import { normalizeStructuredStrengthWorkout } from '../../../utils/strength-exercise-library'

const workoutTemplateUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  sport: z.string().optional(),
  folderId: z.string().nullable().optional(),
  category: z.string().optional(),
  structuredWorkout: z.any().optional(),
  tags: z.array(z.string()).optional(),
  durationSec: z.number().int().optional(),
  tss: z.number().optional(),
  workIntensity: z.number().optional(),
  ownerScope: z.enum(['athlete', 'coach']).optional()
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  const context = getLibraryAccessContext(session.user)
  const body = await readBody(event)

  const validation = workoutTemplateUpdateSchema.safeParse(body)
  if (!validation.success) {
    throw createError({ statusCode: 400, message: validation.error.message })
  }

  const existing = await (prisma as any).workoutTemplate.findFirst({
    where: {
      id,
      userId: {
        in: getReadableLibraryOwnerIds(
          context,
          parseLibraryScope(validation.data.ownerScope, context.isCoaching ? 'all' : 'athlete')
        )
      }
    }
  })

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Template not found' })
  }

  const data = validation.data
  const ownerUserId = existing.userId

  if (data.folderId) {
    const folder = await (prisma as any).workoutTemplateFolder.findFirst({
      where: { id: data.folderId, userId: ownerUserId }
    })

    if (!folder) {
      throw createError({ statusCode: 404, message: 'Folder not found' })
    }
  }

  if (Array.isArray(data.structuredWorkout?.exercises)) {
    try {
      data.structuredWorkout = normalizeStructuredStrengthWorkout(data.structuredWorkout)
    } catch (error: any) {
      throw createError({
        statusCode: 400,
        message: error?.message || 'Invalid strength exercise payload'
      })
    }
  }
  if (Array.isArray(data.structuredWorkout?.blocks)) {
    try {
      data.structuredWorkout = normalizeStructuredStrengthWorkout(data.structuredWorkout)
    } catch (error: any) {
      throw createError({
        statusCode: 400,
        message: error?.message || 'Invalid strength exercise payload'
      })
    }
  }

  // Re-calculate duration/load if structure changed
  if (data.structuredWorkout && !data.durationSec) {
    data.durationSec = computeStructuredWorkoutDurationSec(data.structuredWorkout)
  }
  if (Array.isArray(data.structuredWorkout?.exercises)) {
    const strengthMetrics = computeStrengthExerciseMetrics(data.structuredWorkout.exercises)
    if (!data.tss && strengthMetrics.tss > 0) data.tss = strengthMetrics.tss
    if (!data.workIntensity && strengthMetrics.workIntensity !== null) {
      data.workIntensity = strengthMetrics.workIntensity
    }
  }

  const template = await (prisma as any).workoutTemplate.update({
    where: { id: existing.id },
    data: {
      title: data.title,
      description: data.description,
      type: data.type,
      sport: data.sport,
      folderId: data.folderId,
      category: data.category,
      structuredWorkout: data.structuredWorkout,
      tags: data.tags,
      durationSec: data.durationSec,
      tss: data.tss,
      workIntensity: data.workIntensity
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

  return annotateLibraryOwner(context, template)
})
