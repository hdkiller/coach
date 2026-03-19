import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import { computeStructuredWorkoutDurationSec } from '../../../utils/structured-workout-persistence'
import { z } from 'zod'

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
  workIntensity: z.number().optional()
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  const userId = session.user.id
  const body = await readBody(event)

  const validation = workoutTemplateUpdateSchema.safeParse(body)
  if (!validation.success) {
    throw createError({ statusCode: 400, message: validation.error.message })
  }

  const existing = await (prisma as any).workoutTemplate.findUnique({
    where: { id, userId }
  })

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Template not found' })
  }

  const data = validation.data

  if (data.folderId) {
    const folder = await (prisma as any).workoutTemplateFolder.findFirst({
      where: { id: data.folderId, userId }
    })

    if (!folder) {
      throw createError({ statusCode: 404, message: 'Folder not found' })
    }
  }

  // Re-calculate duration if structure changed
  if (data.structuredWorkout?.steps && !data.durationSec) {
    data.durationSec = computeStructuredWorkoutDurationSec(data.structuredWorkout)
  }

  const template = await (prisma as any).workoutTemplate.update({
    where: { id, userId },
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

  return template
})
