import { z } from 'zod'
import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import {
  annotateLibraryOwner,
  getLibraryAccessContext,
  getReadableLibraryOwnerIds
} from '../../../utils/library-access'
import { normalizeStrengthExerciseLibraryItem } from '../../../utils/strength-exercise-library'

const schema = z.object({
  title: z.string().min(1),
  intent: z.string().optional(),
  movementPattern: z.string().optional(),
  targetMuscleGroups: z.array(z.string()).optional(),
  notes: z.string().optional(),
  videoUrl: z.string().optional(),
  sets: z.number().int().optional(),
  reps: z.string().optional(),
  weight: z.string().optional(),
  duration: z.number().int().optional(),
  rest: z.string().optional(),
  rpe: z.number().optional(),
  prescriptionMode: z.string().optional(),
  loadMode: z.string().optional(),
  defaultRest: z.string().optional(),
  setRows: z.array(z.any()).optional()
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing exercise ID' })
  }

  const body = await readBody(event)
  const validation = schema.safeParse(body)
  if (!validation.success) {
    throw createError({ statusCode: 400, message: validation.error.message })
  }

  const context = getLibraryAccessContext(session.user)
  const existing = await (prisma as any).strengthExerciseLibraryItem.findFirst({
    where: {
      id,
      userId: { in: getReadableLibraryOwnerIds(context, context.isCoaching ? 'all' : 'athlete') }
    }
  })

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Saved strength exercise not found' })
  }

  let normalized: any
  try {
    normalized = normalizeStrengthExerciseLibraryItem(validation.data)
  } catch (error: any) {
    throw createError({ statusCode: 400, message: error.message })
  }

  const item = await (prisma as any).strengthExerciseLibraryItem.update({
    where: { id },
    data: normalized
  })

  return annotateLibraryOwner(context, item)
})
