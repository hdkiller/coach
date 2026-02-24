import { prisma } from './db'
import { queueEmail } from './email-service'
import { formatUserDate } from './date'

const RECENT_WORKOUT_WINDOW_HOURS = 48
const CONSISTENCY_WINDOW_DAYS = 7

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

function inferSportCategory(workoutType?: string | null): 'run' | 'ride' | 'other' {
  if (!workoutType) return 'other'
  const normalized = workoutType.toLowerCase()
  if (normalized.includes('run') || normalized.includes('jog') || normalized.includes('trail'))
    return 'run'
  if (
    normalized.includes('ride') ||
    normalized.includes('cycle') ||
    normalized.includes('bike') ||
    normalized.includes('cycling')
  )
    return 'ride'
  return 'other'
}

function buildQuickTake(options: {
  sportCategory: 'run' | 'ride' | 'other'
  tss?: number
  averageCadence?: number
  averageHr?: number
  averageWatts?: number
  maxHr?: number
}) {
  const { sportCategory, tss, averageCadence, averageHr, averageWatts, maxHr } = options

  let quickTakeLabel = 'Session logged'
  let quickTakeBody =
    'Nice work getting this session in. Consistency is what drives long-term gains.'

  if (typeof tss === 'number' && tss >= 100) {
    quickTakeLabel = 'Big Engine'
    quickTakeBody =
      'This was a high-load session that can move fitness forward. Prioritize recovery to absorb it.'
  } else if (typeof tss === 'number' && tss >= 60) {
    quickTakeLabel = 'Productive'
    quickTakeBody =
      'This load is in a productive range and supports fitness gains without excessive strain.'
  } else if (typeof tss === 'number' && tss > 0) {
    quickTakeLabel = 'Supportive'
    quickTakeBody = 'This was a supportive session that reinforces aerobic base and momentum.'
  }

  if (
    sportCategory === 'run' &&
    typeof averageCadence === 'number' &&
    averageCadence >= 165 &&
    averageCadence <= 185
  ) {
    quickTakeBody +=
      ' Your run cadence was in an efficient range, which supports smooth turnover and economy.'
  }

  if (sportCategory === 'ride' && typeof averageCadence === 'number' && averageCadence >= 85) {
    quickTakeBody +=
      ' Your ride cadence stayed in a sustainable range, helping steady aerobic output.'
  }

  const efficiencyMessage =
    typeof averageHr === 'number' &&
    typeof averageWatts === 'number' &&
    ((sportCategory === 'ride' && averageHr <= 150 && averageWatts >= 210) ||
      (sportCategory === 'run' && averageHr <= 155 && averageWatts >= 230) ||
      (sportCategory === 'other' && averageHr <= 152 && averageWatts >= 220))
      ? sportCategory === 'ride'
        ? 'Efficiency signal: you held strong bike power while keeping heart rate controlled.'
        : sportCategory === 'run'
          ? 'Efficiency signal: you sustained strong run power with controlled heart rate.'
          : 'Efficiency signal: you produced strong power while keeping heart rate controlled.'
      : undefined

  const recoveryMessage =
    typeof maxHr === 'number' &&
    ((sportCategory === 'run' && maxHr >= 178) ||
      (sportCategory === 'ride' && maxHr >= 172) ||
      (sportCategory === 'other' && maxHr >= 175))
      ? sportCategory === 'run'
        ? 'Intensity signal: you touched the top end on this run. Prioritize recovery tonight.'
        : sportCategory === 'ride'
          ? 'Intensity signal: you pushed near your ceiling on the bike. Prioritize recovery tonight.'
          : 'Intensity signal: you touched your top end today. Prioritize recovery tonight.'
      : undefined

  const cadenceUnit = sportCategory === 'ride' ? 'rpm' : 'spm'

  return { quickTakeLabel, quickTakeBody, efficiencyMessage, recoveryMessage, cadenceUnit }
}

function formatDistanceLabel(distanceKm?: number) {
  if (!distanceKm || distanceKm <= 0) return null
  return `${distanceKm.toFixed(1)} km`
}

function getFirstName(name?: string | null) {
  if (!name) return 'Athlete'
  return name.trim().split(/\s+/)[0] || 'Athlete'
}

export async function queueWorkoutInsightEmail(options: QueueWorkoutInsightEmailOptions) {
  const { workoutId, triggerType } = options
  const logContext = { workoutId, triggerType }

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
      elevationGain: true,
      averageCadence: true,
      averageHr: true,
      maxHr: true,
      averageWatts: true,
      tss: true,
      calories: true,
      overallScore: true
    }
  })

  if (!workout) {
    console.info('[WorkoutInsightEmail] Skipped', { ...logContext, reason: 'workout_not_found' })
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
    console.info('[WorkoutInsightEmail] Skipped', {
      ...logContext,
      userId: workout.userId,
      reason: 'user_not_found'
    })
    return { queued: false, reason: 'user_not_found' }
  }

  if (pref?.globalUnsubscribe || pref?.workoutAnalysis === false) {
    console.info('[WorkoutInsightEmail] Skipped', {
      ...logContext,
      userId: workout.userId,
      hasPreferenceRow: Boolean(pref),
      globalUnsubscribe: Boolean(pref?.globalUnsubscribe),
      workoutAnalysisEnabled: pref?.workoutAnalysis ?? null,
      reason: 'email_preference_disabled'
    })
    return { queued: false, reason: 'email_preference_disabled' }
  }

  const timezone = user.timezone || 'UTC'
  const baseUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://coachwatts.com'
  const idempotencyKey = `workout-insights:${workout.id}`
  const distanceKm =
    workout.distanceMeters && workout.distanceMeters > 0
      ? Math.round((workout.distanceMeters / 1000) * 10) / 10
      : undefined

  const consistencyWindowStart = new Date(workout.date)
  consistencyWindowStart.setDate(consistencyWindowStart.getDate() - CONSISTENCY_WINDOW_DAYS + 1)

  const workoutsLast7Days = await prisma.workout.count({
    where: {
      userId: workout.userId,
      isDuplicate: false,
      date: {
        gte: consistencyWindowStart,
        lte: workout.date
      }
    }
  })

  const consistencyMessage =
    workoutsLast7Days >= 3
      ? `That is ${workoutsLast7Days} sessions in the last 7 days. Strong consistency momentum.`
      : undefined

  const sportCategory = inferSportCategory(workout.type)
  const { quickTakeLabel, quickTakeBody, efficiencyMessage, recoveryMessage, cadenceUnit } =
    buildQuickTake({
      sportCategory,
      tss: workout.tss || undefined,
      averageCadence: workout.averageCadence || undefined,
      averageHr: workout.averageHr || undefined,
      averageWatts: workout.averageWatts || undefined,
      maxHr: workout.maxHr || undefined
    })
  const distanceLabel = formatDistanceLabel(distanceKm)

  const commonProps = {
    name: user.name || 'Athlete',
    workoutId: workout.id,
    workoutTitle: workout.title || 'Workout',
    workoutDate: formatUserDate(workout.date, timezone, 'EEEE, MMM d'),
    workoutType: workout.type || undefined,
    durationMinutes: workout.durationSec ? Math.round(workout.durationSec / 60) : undefined,
    distanceKm,
    elevationGain: workout.elevationGain || undefined,
    averageCadence: workout.averageCadence || undefined,
    averageHr: workout.averageHr || undefined,
    maxHr: workout.maxHr || undefined,
    averageWatts: workout.averageWatts || undefined,
    tss: workout.tss || undefined,
    calories: workout.calories || undefined,
    workoutsLast7Days,
    consistencyMessage,
    quickTakeLabel,
    quickTakeBody,
    efficiencyMessage,
    recoveryMessage,
    cadenceUnit,
    nextStepMessage: 'See how this session impacted your Fitness vs Fatigue trend.',
    workoutUrl: `${baseUrl}/workouts/${workout.id}`,
    unsubscribeUrl: `${baseUrl}/profile/settings?tab=communication`
  }

  if (triggerType === 'on-workout-received') {
    if (user.aiAutoAnalyzeWorkouts) {
      console.info('[WorkoutInsightEmail] Skipped', {
        ...logContext,
        userId: workout.userId,
        aiAutoAnalyzeWorkouts: user.aiAutoAnalyzeWorkouts,
        reason: 'auto_ai_enabled_wait_for_enhanced_email'
      })
      return { queued: false, reason: 'auto_ai_enabled_wait_for_enhanced_email' }
    }

    if (!isRecentWorkout(workout.date)) {
      console.info('[WorkoutInsightEmail] Skipped', {
        ...logContext,
        userId: workout.userId,
        workoutDate: workout.date.toISOString(),
        reason: 'workout_not_recent'
      })
      return { queued: false, reason: 'workout_not_recent' }
    }

    await queueEmail({
      userId: workout.userId,
      templateKey: 'WorkoutReceived',
      eventKey: `WORKOUT_RECEIVED_${workout.id}`,
      idempotencyKey,
      subject: distanceLabel
        ? `Great shift, ${getFirstName(user.name)}. ${distanceLabel} in the books.`
        : `Great shift, ${getFirstName(user.name)}. ${workout.title || 'Your workout'} is in the books.`,
      props: commonProps
    })

    return { queued: true, templateKey: 'WorkoutReceived' }
  }

  if (!user.aiAutoAnalyzeWorkouts) {
    console.info('[WorkoutInsightEmail] Skipped', {
      ...logContext,
      userId: workout.userId,
      aiAutoAnalyzeWorkouts: user.aiAutoAnalyzeWorkouts,
      reason: 'auto_ai_disabled'
    })
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
