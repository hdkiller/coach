import { requireAuth } from '../../utils/auth-guard'
import { z } from 'zod'
import { analyzeAthleteSystemPrompt } from '../../utils/analyzeAthletePrompt'
import { fetchAthleteIntervalsData } from '../../utils/intervals'
import { generateCoachAnalysis, buildWorkoutSummary } from '../../utils/gemini'
import { prisma } from '../../utils/db'

const analyzeAthleteSchema = z.object({
  checkInId: z.string()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, [])

  const body = await readBody(event)
  const { checkInId } = analyzeAthleteSchema.parse(body)

  if (!user.intervalsApiKey || !user.intervalsAthleteId) {
    throw createError({
      statusCode: 400,
      message: 'User does not have intervals.icu connected.'
    })
  }

  // Fetch the checkin
  const checkIn = await prisma.checkIn.findUnique({
    where: { id: checkInId, userId: user.id }
  })

  if (!checkIn) {
    throw createError({
      statusCode: 404,
      message: 'CheckIn not found'
    })
  }

  // Fetch Intervals data
  const intervalsData = await fetchAthleteIntervalsData(
    user.intervalsApiKey,
    user.intervalsAthleteId
  )

  // Format prompt
  const workoutSummary = intervalsData.recentActivities
    ? buildWorkoutSummary(intervalsData.recentActivities)
    : 'No recent workouts recorded.'

  const prompt = `${analyzeAthleteSystemPrompt}

## Athlete Data
Subjective Check-In Metrics:
- Fatigue: ${checkIn.personalFatigue}/10
- Stress: ${checkIn.wellnessStress}/10
- Sleep: ${checkIn.wellnessSleep}/10
- Notes: ${checkIn.personalNotes || 'None'}

Objective Training Metrics (Intervals.icu):
- Fitness (CTL): ${intervalsData.wellness?.ctl || 'N/A'}
- Fatigue (ATL): ${intervalsData.wellness?.atl || 'N/A'}
- Form (TSB): ${intervalsData.wellness?.tsb || 'N/A'}

Recent Workouts:
${workoutSummary}

Provide a short, punchy analysis (2-3 sentences) integrating the kinesiology framework and plant-based fueling directives based on this data. Do not include any JSON wrappers, just the raw text.`

  try {
    const analysis = await generateCoachAnalysis(prompt, 'flash', {
      userId: user.id,
      operation: 'digital_twin_analyze_athlete'
    })

    // Save as CoachFeedback
    const feedback = await prisma.coachFeedback.create({
      data: {
        userId: user.id,
        checkInId: checkIn.id,
        coachNotes: analysis
      }
    })

    return {
      status: 'success',
      data: feedback
    }
  } catch (error) {
    console.error('Failed to generate AI coach analysis:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to generate AI analysis'
    })
  }
})
