import { prisma } from './db'
import { queueEmail } from './email-service'
import { formatUserDate } from './date'

const RECENT_WORKOUT_WINDOW_HOURS = 48

type TriggerType = 'on-workout-received' | 'on-analysis-ready' | 'on-adherence-ready'

type QueueWorkoutInsightEmailOptions = {
  workoutId: string
  triggerType: TriggerType
  analysisSummary?: string
  recommendationHighlights?: string[]
  adherenceSummary?: string
  adherenceScore?: number
  overallScore?: number
}

function isRecentWorkout(date: Date) {
  const windowStart = new Date(Date.now() - RECENT_WORKOUT_WINDOW_HOURS * 60 * 60 * 1000)
  return date >= windowStart
}

export async function queueWorkoutInsightEmail(options: QueueWorkoutInsightEmailOptions) {
  const { workoutId, triggerType } = options

  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    select: {
      id: true,
      userId: true,
      title: true,
      date: true,
      type: true,
      durationSec: true,
      distanceMeters: true,
      averageHr: true,
      averageWatts: true,
      tss: true,
      overallScore: true
    }
  })

  if (!workout) {
    return { queued: false, reason: 'workout_not_found' }
  }

  const [user, pref] = await Promise.all([
    prisma.user.findUnique({
      where: { id: workout.userId },
      select: { id: true, name: true, timezone: true, aiAutoAnalyzeWorkouts: true }
    }),
    prisma.emailPreference.findUnique({
      where: {
        userId_channel: {
          userId: workout.userId,
          channel: 'EMAIL'
        }
      }
    })
  ])

  if (!user) {
    return { queued: false, reason: 'user_not_found' }
  }

  if (pref?.globalUnsubscribe || pref?.workoutAnalysis === false) {
    return { queued: false, reason: 'email_preference_disabled' }
  }

  const timezone = user.timezone || 'UTC'
  const baseUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://coachwatts.com'
  const idempotencyKey = `workout-insights:${workout.id}`

  const commonProps = {
    name: user.name || 'Athlete',
    workoutId: workout.id,
    workoutTitle: workout.title || 'Workout',
    workoutDate: formatUserDate(workout.date, timezone, 'EEEE, MMM d'),
    workoutType: workout.type || undefined,
    durationMinutes: workout.durationSec ? Math.round(workout.durationSec / 60) : undefined,
    distanceKm:
      workout.distanceMeters && workout.distanceMeters > 0
        ? Math.round((workout.distanceMeters / 1000) * 10) / 10
        : undefined,
    averageHr: workout.averageHr || undefined,
    averageWatts: workout.averageWatts || undefined,
    tss: workout.tss || undefined,
    workoutUrl: `${baseUrl}/workouts/${workout.id}`,
    unsubscribeUrl: `${baseUrl}/profile/settings?tab=communication`
  }

  if (triggerType === 'on-workout-received') {
    if (user.aiAutoAnalyzeWorkouts) {
      return { queued: false, reason: 'auto_ai_enabled_wait_for_enhanced_email' }
    }

    if (!isRecentWorkout(workout.date)) {
      return { queued: false, reason: 'workout_not_recent' }
    }

    await queueEmail({
      userId: workout.userId,
      templateKey: 'WorkoutReceived',
      eventKey: `WORKOUT_RECEIVED_${workout.id}`,
      idempotencyKey,
      subject: `Great work: ${workout.title || 'your workout'} is synced`,
      props: commonProps
    })

    return { queued: true, templateKey: 'WorkoutReceived' }
  }

  if (!user.aiAutoAnalyzeWorkouts) {
    return { queued: false, reason: 'auto_ai_disabled' }
  }

  await queueEmail({
    userId: workout.userId,
    templateKey: 'WorkoutAnalysisReady',
    eventKey: `WORKOUT_INSIGHTS_READY_${workout.id}`,
    idempotencyKey,
    subject: `Excellent work: analysis ready for ${workout.title || 'your workout'}`,
    props: {
      ...commonProps,
      overallScore: options.overallScore ?? workout.overallScore ?? undefined,
      analysisSummary: options.analysisSummary,
      recommendationHighlights: options.recommendationHighlights,
      adherenceSummary: options.adherenceSummary,
      adherenceScore: options.adherenceScore
    }
  })

  return { queued: true, templateKey: 'WorkoutAnalysisReady' }
}
