import { defineEventHandler, createError, readBody } from 'h3'
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

  const body = await readBody(event)
  const { aiPersona, aiModelPreference, aiAutoAnalyzeWorkouts, aiAutoAnalyzeNutrition } = body

  // Validate inputs
  const validPersonas = ['Analytical', 'Supportive', 'Drill Sergeant', 'Motivational']
  const validModels = ['flash', 'pro']

  if (aiPersona && !validPersonas.includes(aiPersona)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid AI persona'
    })
  }

  if (aiModelPreference && !validModels.includes(aiModelPreference)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid AI model preference'
    })
  }

  const user = await prisma.user.update({
    where: { email: session.user.email },
    data: {
      ...(aiPersona !== undefined && { aiPersona }),
      ...(aiModelPreference !== undefined && { aiModelPreference }),
      ...(aiAutoAnalyzeWorkouts !== undefined && { aiAutoAnalyzeWorkouts }),
      ...(aiAutoAnalyzeNutrition !== undefined && { aiAutoAnalyzeNutrition })
    },
    select: {
      aiPersona: true,
      aiModelPreference: true,
      aiAutoAnalyzeWorkouts: true,
      aiAutoAnalyzeNutrition: true
    }
  })

  return {
    success: true,
    settings: user
  }
})