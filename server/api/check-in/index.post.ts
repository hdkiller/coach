import { requireAuth } from '../../utils/auth-guard'
import { z } from 'zod'

const checkInSchema = z.object({
  personalChallenges: z.string().optional().nullable(),
  personalGoals: z.string().optional().nullable(),
  personalHighlights: z.string().optional().nullable(),
  personalNotes: z.string().optional().nullable(),
  wellnessInjury: z.string().optional().nullable(),
  wellnessPain: z.string().optional().nullable(),
  personalFatigue: z.number().optional().nullable(),
  trainingDifficulty: z.number().optional().nullable(),
  trainingHydration: z.number().optional().nullable(),
  trainingLoad: z.number().optional().nullable(),
  trainingNutrition: z.number().optional().nullable(),
  trainingRecovery: z.number().optional().nullable(),
  wellnessSleep: z.number().optional().nullable(),
  wellnessStress: z.number().optional().nullable()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, [])

  const body = await readBody(event)
  const data = checkInSchema.parse(body)

  try {
    const checkIn = await prisma.checkIn.create({
      data: {
        userId: user.id,
        ...data
      }
    })

    // Trigger AI analysis asynchronously if Intervals is connected
    if (user.intervalsApiKey && user.intervalsAthleteId) {
      $fetch<any>('/api/ai/analyze-athlete', {
        method: 'POST',
        headers: {
          cookie: event.node.req.headers.cookie || '' // Forward auth cookie
        },
        body: { checkInId: checkIn.id }
      }).catch((err) => console.error('Async analyze-athlete failed:', err))
    }

    return {
      status: 'success',
      data: checkIn
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: 'Failed to create check-in'
    })
  }
})
