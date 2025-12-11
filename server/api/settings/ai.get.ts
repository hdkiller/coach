import { defineEventHandler, createError } from 'h3'
import { getServerSession } from '#auth'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.email) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      aiPersona: true,
      aiModelPreference: true,
      aiAutoAnalyzeWorkouts: true,
      aiAutoAnalyzeNutrition: true
    }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  return {
    aiPersona: user.aiPersona || 'Supportive',
    aiModelPreference: user.aiModelPreference || 'flash',
    aiAutoAnalyzeWorkouts: user.aiAutoAnalyzeWorkouts ?? false,
    aiAutoAnalyzeNutrition: user.aiAutoAnalyzeNutrition ?? false
  }
})