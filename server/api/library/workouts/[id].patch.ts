import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import { z } from 'zod'

const workoutTemplateUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  sport: z.string().optional(),
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

  // Re-calculate duration if structure changed
  if (data.structuredWorkout?.steps && !data.durationSec) {
    data.durationSec = data.structuredWorkout.steps.reduce((acc: number, step: any) => {
      return acc + (step.duration || 0) * 60
    }, 0)
  }

  const template = await (prisma as any).workoutTemplate.update({
    where: { id, userId },
    data: {
      title: data.title,
      description: data.description,
      type: data.type,
      sport: data.sport,
      category: data.category,
      structuredWorkout: data.structuredWorkout,
      tags: data.tags,
      durationSec: data.durationSec,
      tss: data.tss,
      workIntensity: data.workIntensity
    }
  })

  return template
})
