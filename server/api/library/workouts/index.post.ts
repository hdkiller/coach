import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import { z } from 'zod'

const workoutTemplateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.string().default('Ride'),
  sport: z.string().default('Cycling'),
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

  const userId = session.user.id
  const body = await readBody(event)

  const validation = workoutTemplateSchema.safeParse(body)
  if (!validation.success) {
    throw createError({ statusCode: 400, message: validation.error.message })
  }

  const data = validation.data

  // Calculate duration if steps are provided but duration isn't
  if (!data.durationSec && data.structuredWorkout?.steps) {
    data.durationSec = data.structuredWorkout.steps.reduce((acc: number, step: any) => {
      return acc + (step.duration || 0) * 60
    }, 0)
  }

  const template = await (prisma as any).workoutTemplate.create({
    data: {
      userId,
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
    }
  })

  return template
})
