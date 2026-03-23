import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import { z } from 'zod'

const favoriteSchema = z.object({
  planId: z.string(),
  isFavorite: z.boolean()
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = session.user.id
  const validation = favoriteSchema.safeParse(await readBody(event))
  if (!validation.success) {
    throw createError({ statusCode: 400, message: validation.error.message })
  }

  const { planId, isFavorite } = validation.data

  if (isFavorite) {
    await prisma.favoriteTrainingPlan.upsert({
      where: {
        userId_planId: { userId, planId }
      },
      create: { userId, planId },
      update: {}
    })
  } else {
    await prisma.favoriteTrainingPlan.deleteMany({
      where: { userId, planId }
    })
  }

  return { success: true }
})
