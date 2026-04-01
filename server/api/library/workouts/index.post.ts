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
  getWritableLibraryOwnerId,
  parseLibraryScope
} from '../../../utils/library-access'

const workoutTemplateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.string().default('Ride'),
  sport: z.string().default('Cycling'),
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

  const context = getLibraryAccessContext(session.user)
  const body = await readBody(event)

  const validation = workoutTemplateSchema.safeParse(body)
  if (!validation.success) {
    throw createError({ statusCode: 400, message: validation.error.message })
  }

  const data = validation.data
  const ownerUserId = getWritableLibraryOwnerId(
    context,
    parseLibraryScope(data.ownerScope, 'coach')
  )

  if (data.folderId) {
    const folder = await (prisma as any).workoutTemplateFolder.findFirst({
      where: { id: data.folderId, userId: ownerUserId }
    })

    if (!folder) {
      throw createError({ statusCode: 404, message: 'Folder not found' })
    }
  }

  // Calculate duration/load if structure is provided but explicit values are missing
  if (!data.durationSec && data.structuredWorkout) {
    data.durationSec = computeStructuredWorkoutDurationSec(data.structuredWorkout)
  }
  if (Array.isArray(data.structuredWorkout?.exercises)) {
    const strengthMetrics = computeStrengthExerciseMetrics(data.structuredWorkout.exercises)
    if (!data.tss && strengthMetrics.tss > 0) data.tss = strengthMetrics.tss
    if (!data.workIntensity && strengthMetrics.workIntensity !== null) {
      data.workIntensity = strengthMetrics.workIntensity
    }
  }

  const template = await (prisma as any).workoutTemplate.create({
    data: {
      userId: ownerUserId,
      folderId: data.folderId ?? null,
      title: data.title,
      description: data.description,
      type: data.type,
      sport: data.sport,
      category: data.category,
      structuredWorkout: data.structuredWorkout,
      tags: data.tags || [],
      durationSec: data.durationSec || 0,
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
