import { prisma } from './db'
import { queueEmail } from './email-service'
import { formatUserDate, getStartOfDaysAgoUTC } from './date'
import { sportSettingsRepository } from './repositories/sportSettingsRepository'

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
  ftp?: number
  lthr?: number
  userMaxHr?: number
}) {
  const {
    sportCategory,
    tss,
    averageCadence,
    averageHr,
    averageWatts,
    maxHr,
    ftp,
    lthr,
    userMaxHr
  } = options

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

  // Efficiency signal: High relative power for low relative HR
  const relPower =
    typeof averageWatts === 'number' && typeof ftp === 'number' && ftp > 0
      ? averageWatts / ftp
      : null
  const relHr =
    typeof averageHr === 'number' && typeof lthr === 'number' && lthr > 0 ? averageHr / lthr : null

  const efficiencyMessage =
    relPower && relHr && relPower >= 0.7 && relHr <= 0.85
      ? sportCategory === 'ride'
        ? 'Efficiency signal: you held strong bike power while keeping heart rate controlled.'
        : sportCategory === 'run'
          ? 'Efficiency signal: you sustained strong run power with controlled heart rate.'
          : 'Efficiency signal: you produced strong power while keeping heart rate controlled.'
      : undefined

  // Intensity signal: Touching high % of max HR or LTHR
  const maxRelHr =
    typeof maxHr === 'number' && typeof userMaxHr === 'number' && userMaxHr > 0
      ? maxHr / userMaxHr
      : null
  const maxRelLthr =
    typeof maxHr === 'number' && typeof lthr === 'number' && lthr > 0 ? maxHr / lthr : null

  const recoveryMessage =
    (maxRelHr && maxRelHr >= 0.95) || (maxRelLthr && maxRelLthr >= 1.05)
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

export function normalizeSubjectSpacing(subject: string) {
  if (!subject) return subject

  let normalized = ''
  for (let i = 0; i < subject.length; i += 1) {
    const current = subject[i] as string
    const next = subject[i + 1]

    normalized += current

    if (!next) continue
    if (!/[,.!?;:]/.test(current)) continue
    if (next === ' ') continue

    // Keep numeric punctuation untouched (e.g., 66.7, 1,000).
    const beforeToken = subject.slice(0, i).match(/([A-Za-z0-9]+)$/)?.[1] || ''
    const afterToken = subject.slice(i + 1).match(/^([A-Za-z0-9]+)/)?.[1] || ''
    const isNumericPunctuation =
      (current === '.' || current === ',') && /^\d+$/.test(beforeToken) && /^\d+$/.test(afterToken)
    if (isNumericPunctuation) continue

    normalized += ' '
  }

  return normalized.replace(/\s{2,}/g, ' ').trim()
}

function hashString(input: string) {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) % 2147483647
  }
  return Math.abs(hash)
}

function pickVariant<T>(key: string, variants: T[]) {
  if (!variants.length) {
    throw new Error('pickVariant requires at least one variant')
  }
  return variants[hashString(key) % variants.length]
}

function buildLoadContext(tss7d?: number, weeklyTssBaseline28d?: number) {
  if (
    typeof tss7d !== 'number' ||
    typeof weeklyTssBaseline28d !== 'number' ||
    weeklyTssBaseline28d <= 0
  ) {
    return {
      loadContextLabel: 'Load Context',
      loadContextBody:
        'Keep stacking consistent sessions to establish your personal load baseline.',
      loadDeltaPct: undefined as number | undefined
    }
  }

  const loadDeltaPct = Math.round(((tss7d - weeklyTssBaseline28d) / weeklyTssBaseline28d) * 100)

  if (loadDeltaPct >= 20) {
    return {
      loadContextLabel: 'Aggressive Load Week',
      loadContextBody:
        'Your recent load is well above your 4-week baseline. Great for adaptation when recovery is handled well.',
      loadDeltaPct
    }
  }

  if (loadDeltaPct >= 6) {
    return {
      loadContextLabel: 'Progressive Week',
      loadContextBody:
        'You are training above your recent baseline in a productive range that supports progression.',
      loadDeltaPct
    }
  }

  if (loadDeltaPct >= -10) {
    return {
      loadContextLabel: 'Balanced Week',
      loadContextBody:
        'Your recent load is close to baseline, which is strong for maintaining momentum and consistency.',
      loadDeltaPct
    }
  }

  return {
    loadContextLabel: 'Recovery-Leaning Week',
    loadContextBody:
      'Your recent load is below baseline, which can help consolidate gains before the next build.',
    loadDeltaPct
  }
}

function buildSportLens(options: {
  sportCategory: 'run' | 'ride' | 'other'
  averageCadence?: number
  averageHr?: number
  averageWatts?: number
  sportFtp?: number
  sportLthr?: number
  sportMaxHr?: number
}) {
  const {
    sportCategory,
    averageCadence,
    averageHr,
    averageWatts,
    sportFtp,
    sportLthr,
    sportMaxHr
  } = options

  if (sportCategory === 'ride') {
    if (typeof averageWatts === 'number' && typeof sportFtp === 'number' && sportFtp > 0) {
      const ftpPct = Math.round((averageWatts / sportFtp) * 100)
      if (ftpPct < 75) {
        return {
          sportLensLabel: 'Ride Lens',
          sportLensBody: `Average power sat around ${ftpPct}% of FTP, indicating mostly endurance-zone work.`
        }
      }
      if (ftpPct <= 89) {
        return {
          sportLensLabel: 'Ride Lens',
          sportLensBody: `Average power sat around ${ftpPct}% of FTP, a strong tempo-oriented stimulus.`
        }
      }
      if (ftpPct <= 105) {
        return {
          sportLensLabel: 'Ride Lens',
          sportLensBody: `Average power sat around ${ftpPct}% of FTP, right in threshold-development territory.`
        }
      }
      return {
        sportLensLabel: 'Ride Lens',
        sportLensBody: `Average power sat around ${ftpPct}% of FTP, signaling a high-intensity effort.`
      }
    }

    if (typeof averageCadence === 'number') {
      if (averageCadence >= 90) {
        return {
          sportLensLabel: 'Ride Lens',
          sportLensBody:
            'Cadence was high and fluid, which is often helpful for aerobic sustainability and leg freshness.'
        }
      }
      if (averageCadence <= 75) {
        return {
          sportLensLabel: 'Ride Lens',
          sportLensBody:
            'Cadence trended lower, which can build muscular endurance, especially on climbs or torque-focused work.'
        }
      }
    }
  }

  if (sportCategory === 'run') {
    if (typeof averageHr === 'number' && typeof sportLthr === 'number' && sportLthr > 0) {
      const lthrPct = Math.round((averageHr / sportLthr) * 100)
      if (lthrPct < 85) {
        return {
          sportLensLabel: 'Run Lens',
          sportLensBody: `Average HR was about ${lthrPct}% of LTHR, aligning with aerobic-base development.`
        }
      }
      if (lthrPct <= 95) {
        return {
          sportLensLabel: 'Run Lens',
          sportLensBody: `Average HR was about ${lthrPct}% of LTHR, a steady effort that builds durable race fitness.`
        }
      }
      return {
        sportLensLabel: 'Run Lens',
        sportLensBody: `Average HR was about ${lthrPct}% of LTHR, indicating threshold-oriented stress.`
      }
    }

    if (typeof averageCadence === 'number') {
      if (averageCadence >= 165 && averageCadence <= 185) {
        return {
          sportLensLabel: 'Run Lens',
          sportLensBody:
            'Cadence landed in a generally efficient range, which supports smoother turnover and economy.'
        }
      }
      if (averageCadence < 160) {
        return {
          sportLensLabel: 'Run Lens',
          sportLensBody:
            'Cadence was on the lower side; adding gentle turnover drills can help improve running economy.'
        }
      }
    }
  }

  if (typeof averageHr === 'number' && typeof sportMaxHr === 'number' && sportMaxHr > 0) {
    const maxHrPct = Math.round((averageHr / sportMaxHr) * 100)
    return {
      sportLensLabel: 'Session Lens',
      sportLensBody: `Average HR was about ${maxHrPct}% of max HR, giving useful context for session intensity.`
    }
  }

  return {
    sportLensLabel: 'Session Lens',
    sportLensBody:
      'This session adds another meaningful data point to your trendline and helps sharpen your training signal.'
  }
}

export function buildInterestingCopy(options: {
  workoutId: string
  sportCategory: 'run' | 'ride' | 'other'
  workoutTitle: string
  firstName: string
  distanceLabel?: string | null
  tss?: number
  loadDeltaPct?: number
  workoutsLast7Days?: number
}) {
  const {
    workoutId,
    sportCategory,
    workoutTitle,
    firstName,
    distanceLabel,
    tss,
    loadDeltaPct,
    workoutsLast7Days
  } = options
  const key = `${workoutId}:${sportCategory}`

  let heroTitle = pickVariant(key, [
    'Workout synced and momentum building.',
    'Session logged. Progress in motion.',
    'Another strong brick in your training wall.'
  ])

  if (typeof workoutsLast7Days === 'number' && workoutsLast7Days >= 4) {
    heroTitle = pickVariant(`${key}:hero-consistency`, [
      `${workoutsLast7Days} sessions in 7 days. Your momentum is building.`,
      `Consistency unlocked. Another solid brick in the wall.`,
      `Showing up is half the battle. Session captured.`
    ])
  } else if (typeof tss === 'number' && tss >= 100) {
    heroTitle = pickVariant(`${key}:hero-load`, [
      `Big Engine session logged: ${Math.round(tss)} TSS.`,
      `Solid effort. Productive stress mapped.`,
      `Massive shift today. Recovery starts now.`
    ])
  } else if (distanceLabel) {
    heroTitle = pickVariant(`${key}:hero-distance`, [
      `Great shift. ${distanceLabel} in the books.`,
      `Session secured. ${distanceLabel} completed.`,
      `That's ${distanceLabel} added to your timeline.`
    ])
  } else if (typeof loadDeltaPct === 'number' && loadDeltaPct > 10) {
    heroTitle = pickVariant(`${key}:hero-delta`, [
      `Solid effort. Pushing ${loadDeltaPct}% above your recent baseline.`,
      `Progressive load secured. Pushing the baseline up.`,
      `Productive stimulus logged. Great shift.`
    ])
  }

  const introLine = pickVariant(`${key}:intro`, [
    `Solid work today. ${workoutTitle} is now on your timeline and ready to review.`,
    `Nice execution. ${workoutTitle} has been captured and added to your training history.`,
    `Strong session. ${workoutTitle} is in, and your trends just got sharper.`
  ])

  const ctaLabel = pickVariant(`${key}:cta`, [
    'View Full Analysis & Splits',
    'Open Workout Details',
    'Review This Session'
  ])

  const nextStepMessage = pickVariant(`${key}:next`, [
    'See how this session impacted your Fitness vs Fatigue trend.',
    'Open your detail page to inspect execution patterns while the session is fresh.',
    'Review your charts and timeline now to lock in learnings for the next workout.'
  ])

  const subject = normalizeSubjectSpacing(
    (distanceLabel
      ? pickVariant(`${key}:subject-distance`, [
          `Great shift, ${firstName}. ${distanceLabel} in the books.`,
          `${firstName}, ${distanceLabel} logged. Your trendline just moved.`,
          `${distanceLabel} complete, ${firstName}. Session synced and ready.`
        ])
      : pickVariant(`${key}:subject-title`, [
          `Great shift, ${firstName}. ${workoutTitle} is in the books.`,
          `${firstName}, ${workoutTitle} is synced and ready to review.`,
          `${workoutTitle} logged, ${firstName}. Momentum stays on.`
        ])) as string
  )

  const previewLine = `${workoutTitle} is synced. Open for insights, load context, and sport-specific cues.`

  return { heroTitle, introLine, ctaLabel, nextStepMessage, subject, previewLine }
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
      normalizedPower: true,
      tss: true,
      kilojoules: true,
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

  const consistencyWindowStart = getStartOfDaysAgoUTC(timezone, 6, workout.date)
  const tssWindowStart = getStartOfDaysAgoUTC(timezone, 27, workout.date)

  const [workoutsLast7Days, windowWorkouts, sportSettings] = await Promise.all([
    prisma.workout.count({
      where: {
        userId: workout.userId,
        isDuplicate: false,
        date: {
          gte: consistencyWindowStart,
          lte: workout.date
        }
      }
    }),
    prisma.workout.findMany({
      where: {
        userId: workout.userId,
        isDuplicate: false,
        date: {
          gte: tssWindowStart,
          lte: workout.date
        }
      },
      select: {
        date: true,
        tss: true
      }
    }),
    sportSettingsRepository.getForActivityType(workout.userId, workout.type || '')
  ])

  const consistencyMessage =
    workoutsLast7Days >= 3
      ? `That is ${workoutsLast7Days} sessions in the last 7 days. Strong consistency momentum.`
      : undefined

  const sportCategory = inferSportCategory(workout.type)
  const tss28d = windowWorkouts.reduce((sum, entry) => sum + (entry.tss || 0), 0)
  const start7d = getStartOfDaysAgoUTC(timezone, 6, workout.date)
  const tss7d = windowWorkouts.reduce((sum, entry) => {
    return entry.date >= start7d ? sum + (entry.tss || 0) : sum
  }, 0)
  const weeklyTssBaseline28d = tss28d > 0 ? Math.round((tss28d / 4) * 10) / 10 : undefined
  const { loadContextLabel, loadContextBody, loadDeltaPct } = buildLoadContext(
    tss7d > 0 ? Math.round(tss7d) : undefined,
    weeklyTssBaseline28d
  )
  const { quickTakeLabel, quickTakeBody, efficiencyMessage, recoveryMessage, cadenceUnit } =
    buildQuickTake({
      sportCategory,
      tss: workout.tss || undefined,
      averageCadence: workout.averageCadence || undefined,
      averageHr: workout.averageHr || undefined,
      averageWatts: workout.averageWatts || undefined,
      maxHr: workout.maxHr || undefined,
      ftp: sportSettings?.ftp || undefined,
      lthr: sportSettings?.lthr || undefined,
      userMaxHr: sportSettings?.maxHr || undefined
    })
  const { sportLensLabel, sportLensBody } = buildSportLens({
    sportCategory,
    averageCadence: workout.averageCadence || undefined,
    averageHr: workout.averageHr || undefined,
    averageWatts: workout.averageWatts || undefined,
    sportFtp: sportSettings?.ftp || undefined,
    sportLthr: sportSettings?.lthr || undefined,
    sportMaxHr: sportSettings?.maxHr || undefined
  })
  const distanceLabel = formatDistanceLabel(distanceKm)
  const firstName = getFirstName(user.name)
  const { heroTitle, introLine, ctaLabel, nextStepMessage, subject, previewLine } =
    buildInterestingCopy({
      workoutId: workout.id,
      sportCategory,
      workoutTitle: workout.title || 'Workout',
      firstName,
      distanceLabel,
      tss: workout.tss || undefined,
      loadDeltaPct,
      workoutsLast7Days
    })

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
    normalizedPower: workout.normalizedPower || undefined,
    tss: workout.tss || undefined,
    kilojoules: workout.kilojoules || undefined,
    calories: workout.calories || undefined,
    tss7d: tss7d > 0 ? Math.round(tss7d) : undefined,
    weeklyTssBaseline28d,
    loadContextLabel,
    loadContextBody,
    loadDeltaPct,
    workoutsLast7Days,
    consistencyMessage,
    heroTitle,
    introLine,
    previewLine,
    quickTakeLabel,
    quickTakeBody,
    efficiencyMessage,
    recoveryMessage,
    sportLensLabel,
    sportLensBody,
    cadenceUnit,
    ctaLabel,
    nextStepMessage,
    workoutUrl: `${baseUrl}/workouts/${workout.id}`,
    unsubscribeUrl: `${baseUrl}/profile/settings?tab=communication`,
    shareUrl: `${baseUrl}/workouts/${workout.id}?share=true`,
    chatUrl: `${baseUrl}/chat?workoutId=${workout.id}`
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
      subject,
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
