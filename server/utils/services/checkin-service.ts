import { dailyCheckinRepository } from '../repositories/dailyCheckinRepository'
import {
  formatUserDate,
  formatDateUTC,
  getUserLocalDate,
  getUserTimezone,
  calculateAge
} from '../date'
import { auditLogRepository } from '../repositories/auditLogRepository'
import { generateStructuredAnalysis, buildWorkoutSummary } from '../gemini'
import { prisma } from '../db'
import { workoutRepository } from '../repositories/workoutRepository'
import { wellnessRepository } from '../repositories/wellnessRepository'
import { formatPromptWeight, formatPromptHeight, formatPromptDistance } from '../ai-prompt-format'
import { calculateProjectedPMC, getCurrentFitnessSummary } from '../training-stress'
import { getUserAiSettings } from '../ai-user-settings'
import { checkQuota } from '../quotas/engine'
import { filterGoalsForContext } from '../goal-context'
import { getCalendarNoteDisplayEndDate } from '../calendar-notes'
import {
  getMoodLabel,
  getStressLabel,
  getFatigueLabel,
  getSorenessLabel,
  getMotivationLabel,
  getHydrationLabel,
  getInjuryLabel,
  getCanonicalWellnessStress
} from '../wellness'
import {
  ATHLETE_AUTONOMY_PROMPT_BLOCK,
  buildCalendarSourceOfTruthPrompt
} from '../recommendation-guardrails'
import { registerTaskHandler } from '../task-registry'
import { dispatchTask } from '../task-dispatcher'

const checkinSchema = {
  type: 'object',
  properties: {
    openingRemark: { type: 'string' },
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          text: { type: 'string' },
          reasoning: { type: 'string' }
        },
        required: ['id', 'text', 'reasoning']
      }
    }
  },
  required: ['openingRemark', 'questions']
}

interface CheckinAnalysis {
  openingRemark: string
  questions: Array<{
    id: string
    text: string
    reasoning: string
  }>
}

export type DailyCheckinSource = 'auto' | 'user'

export type GenerateDailyCheckinPayload = {
  userId: string
  date: Date
  checkinId?: string
  source?: DailyCheckinSource
}

/**
 * Triggers a daily check-in generation if one doesn't exist for the user's current day.
 */
export async function triggerDailyCheckinIfNeeded(userId: string) {
  try {
    const timezone = await getUserTimezone(userId)
    const today = getUserLocalDate(timezone)

    const existing = await dailyCheckinRepository.getByDate(userId, today)

    if (existing) {
      return { triggered: false, reason: 'Daily check-in already exists for today' }
    }

    const dateIsoStr =
      today instanceof Date && !isNaN(today.getTime()) ? today.toISOString() : String(today)

    console.log(
      `🤖 [Auto-Analyze] [DailyCheckin] Triggering check-in generation for user ${userId} on ${dateIsoStr}`
    )

    await dispatchTask(
      'generate-daily-checkin',
      {
        userId,
        date: today,
        source: 'auto'
      },
      {
        concurrencyKey: userId,
        tags: [`user:${userId}`]
      }
    )

    await auditLogRepository.log({
      userId,
      action: 'AUTO_GENERATE_CHECKIN',
      resourceType: 'DailyCheckin',
      metadata: { date: dateIsoStr, source: 'webhook' }
    })

    return { triggered: true }
  } catch (error) {
    console.error(`[DailyCheckin] Failed to trigger check-in for user ${userId}:`, error)
    return { triggered: false, error }
  }
}

/**
 * Fetches and formats completed daily check-ins for a given date range.
 * Returns a formatted string suitable for AI prompts.
 */
export async function getCheckinHistoryContext(
  userId: string,
  startDate: Date,
  endDate: Date,
  timezone: string
): Promise<string> {
  const checkins = await dailyCheckinRepository.getHistory(userId, startDate, endDate)

  if (checkins.length === 0) {
    return ''
  }

  return checkins
    .map((c) => {
      const qs = c.questions as any[]
      const answeredQuestions = qs.filter((q) => q.answer)

      if (answeredQuestions.length === 0 && !c.userNotes) return null

      const dateStr = formatDateUTC(c.date, 'yyyy-MM-dd')
      let content = ''

      if (answeredQuestions.length > 0) {
        content += answeredQuestions
          .map(
            (q) => `  * Q: "${q.text}"
    A: ${q.answer}`
          )
          .join('\n')
      }

      if (c.userNotes) {
        if (content) content += '\n'
        content += `  * User Notes: "${c.userNotes}"`
      }

      return `[${dateStr}]
${content}`
    })
    .filter(Boolean)
    .join('\n\n')
}

export async function runGenerateDailyCheckin(payload: GenerateDailyCheckinPayload) {
  const { userId, date } = payload
  let { checkinId } = payload
  const source: DailyCheckinSource = payload.source ?? 'user'

  try {
    const today = new Date(date)

    if (!checkinId) {
      const existing = await dailyCheckinRepository.getByDate(userId, today)
      if (existing) {
        checkinId = existing.id
        await dailyCheckinRepository.update(checkinId, { status: 'PROCESSING' })
      } else {
        const newCheckin = await dailyCheckinRepository.create({
          user: { connect: { id: userId } },
          date: today,
          questions: [],
          status: 'PROCESSING'
        })
        checkinId = newCheckin.id
      }
    } else {
      await dailyCheckinRepository.update(checkinId, { status: 'PROCESSING' })
    }

    if (source !== 'auto') {
      try {
        await checkQuota(userId, 'daily_checkin')
      } catch (quotaError: any) {
        if (quotaError.statusCode === 429) {
          if (checkinId) {
            await dailyCheckinRepository.update(checkinId, {
              status: 'FAILED'
            })
          }
          return { success: false, reason: 'QUOTA_EXCEEDED' }
        }
        throw quotaError
      }
    }

    const aiSettings = await getUserAiSettings(userId)
    const userTimezone = await getUserTimezone(userId)

    const [
      plannedWorkout,
      todayMetric,
      recentWorkouts,
      user,
      athleteProfile,
      rawActiveGoals,
      currentFitness,
      pastCheckins,
      futureWorkouts,
      currentPlan,
      upcomingEvents,
      calendarNotes,
      journeyEvents
    ] = await Promise.all([
      prisma.plannedWorkout.findFirst({
        where: { userId, date: today },
        orderBy: { createdAt: 'desc' }
      }),

      wellnessRepository.getByDate(userId, today),

      workoutRepository.getForUser(userId, {
        startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        orderBy: { date: 'desc' },
        includeDuplicates: false,
        include: {
          streams: {
            select: {
              hrZoneTimes: true,
              powerZoneTimes: true
            }
          }
        }
      }),

      prisma.user.findUnique({
        where: { id: userId },
        select: {
          ftp: true,
          weight: true,
          weightUnits: true,
          height: true,
          heightUnits: true,
          timezone: true,
          maxHr: true,
          lthr: true,
          dob: true,
          sex: true,
          language: true
        }
      }),

      prisma.athleteProfile.findUnique({
        where: { userId }
      }),

      prisma.userGoal.findMany({
        where: { userId, isCompleted: false },
        orderBy: [{ targetDate: 'asc' }, { createdAt: 'desc' }]
      }),

      getCurrentFitnessSummary(userId),

      getCheckinHistoryContext(
        userId,
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 24 * 60 * 60 * 1000),
        userTimezone
      ),

      prisma.plannedWorkout.findMany({
        where: {
          userId,
          date: {
            gt: today,
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { date: 'asc' }
      }),

      prisma.trainingPlan.findFirst({
        where: { userId, status: 'ACTIVE' },
        include: {
          blocks: {
            orderBy: { weekNumber: 'asc' },
            include: {
              plannedWorkouts: {
                orderBy: { dayOfWeek: 'asc' }
              }
            }
          }
        }
      }),

      prisma.calendarEvent.findMany({
        where: {
          userId,
          date: {
            gte: today,
            lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { date: 'asc' }
      }),

      prisma.calendarNote.findMany({
        where: {
          userId,
          date: {
            lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { date: 'asc' }
      }),

      prisma.athleteJourneyEvent.findMany({
        where: {
          userId,
          timestamp: {
            gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 10
      })
    ])

    const activeGoals = filterGoalsForContext(rawActiveGoals, today)
    const activeNotes = calendarNotes.filter((note) => {
      const displayEndDate = getCalendarNoteDisplayEndDate(note)
      return note.date <= today && displayEndDate >= today
    })

    const pmcProjections = calculateProjectedPMC(currentFitness, futureWorkouts)

    let prompt = `You are Coach Watts generating a Daily Check-in for an athlete.

ATHLETE CONTEXT:
- Persona: ${aiSettings.aiPersona}
- Language: ${user?.language || 'English'}
- User Timezone: ${userTimezone}
`

    if (user?.dob) prompt += `- Age: ${calculateAge(user.dob)}\n`
    if (user?.sex) prompt += `- Sex: ${user.sex}\n`
    if (user?.weight) prompt += `- Weight: ${formatPromptWeight(user.weight, user.weightUnits)}\n`
    if (user?.height) prompt += `- Height: ${formatPromptHeight(user.height, user.heightUnits)}\n`
    if (user?.ftp) prompt += `- FTP: ${user.ftp} W\n`

    if (athleteProfile?.summary) {
      prompt += `\nATHLETE PROFILE SUMMARY:\n${athleteProfile.summary}\n`
    }

    if (activeGoals.length > 0) {
      prompt += `\nACTIVE ATHLETE GOALS:\n`
      activeGoals.forEach((g) => {
        const targetStr = g.targetDate
          ? formatDateUTC(g.targetDate, 'yyyy-MM-dd')
          : 'No target date'
        prompt += `- [${g.category}] ${g.title} (Target: ${targetStr})\n`
      })
    }

    if (activeNotes.length > 0) {
      prompt += `\nACTIVE CALENDAR NOTES / CONTEXT:\n`
      activeNotes.forEach((n) => {
        const noteDateStr = formatDateUTC(n.date, 'yyyy-MM-dd')
        const noteEndDateStr = formatDateUTC(getCalendarNoteDisplayEndDate(n), 'yyyy-MM-dd')
        const rangeStr =
          noteDateStr === noteEndDateStr ? noteDateStr : `${noteDateStr} to ${noteEndDateStr}`
        prompt += `- [${n.category}] ${n.title} (${rangeStr}): ${n.content}\n`
      })
    }

    if (journeyEvents.length > 0) {
      prompt += `\nRECENT JOURNEY EVENTS & INJURY/ILLNESS LOGS:\n`
      journeyEvents.forEach((e) => {
        const dateStr = formatDateUTC(e.timestamp, 'yyyy-MM-dd')
        prompt += `- [${dateStr}] [${e.category}] ${e.title} (Severity: ${e.severity}/5): ${e.description || 'No details'}\n`
      })
    }

    prompt += `\nRECOVERY & WELLNESS (TODAY):
`
    if (todayMetric) {
      if (todayMetric.sleepScore) prompt += `- Sleep Score: ${todayMetric.sleepScore}/100\n`
      if (todayMetric.sleepHours) prompt += `- Sleep Duration: ${todayMetric.sleepHours} hours\n`
      if (todayMetric.hrv) prompt += `- HRV: ${todayMetric.hrv} ms\n`
      if (todayMetric.readinessScore)
        prompt += `- Readiness Score: ${todayMetric.readinessScore}/100\n`
      if (todayMetric.soreness)
        prompt += `- Muscle Soreness: ${getSorenessLabel(todayMetric.soreness)}\n`
      if (todayMetric.fatigue) prompt += `- Fatigue: ${getFatigueLabel(todayMetric.fatigue)}\n`
      if (todayMetric.stress)
        prompt += `- Stress: ${getStressLabel(getCanonicalWellnessStress(todayMetric))}\n`
      if (todayMetric.mood) prompt += `- Mood: ${getMoodLabel(todayMetric.mood)}\n`
    } else {
      prompt += `- No wellness metrics logged yet today.\n`
    }

    if (plannedWorkout) {
      prompt += `\nPLANNED WORKOUT FOR TODAY:\n`
      prompt += `- Title: ${plannedWorkout.title}\n`
      prompt += `- Type: ${plannedWorkout.activityType}\n`
      if (plannedWorkout.description) prompt += `- Description: ${plannedWorkout.description}\n`
    }

    if (pastCheckins) {
      prompt += `\nRECENT CHECK-IN HISTORY (PAST 7 DAYS):\n${pastCheckins}\n`
    }

    prompt += `
${ATHLETE_AUTONOMY_PROMPT_BLOCK}

${buildCalendarSourceOfTruthPrompt({
  today,
  plannedWorkouts: plannedWorkout ? [plannedWorkout] : [],
  upcomingEvents,
  activeNotes
})}

Generate 3 to 5 YES/NO questions to assess athlete readiness.`

    const analysis = await generateStructuredAnalysis<CheckinAnalysis>(
      prompt,
      checkinSchema,
      aiSettings.aiModelPreference,
      {
        userId,
        operation: 'daily_checkin',
        entityType: 'DailyCheckin',
        entityId: checkinId,
        counted: source !== 'auto'
      }
    )

    const checkinExists = await prisma.dailyCheckin.findUnique({
      where: { id: checkinId },
      select: { id: true }
    })

    if (!checkinExists) {
      return { success: true, skipped: true }
    }

    await dailyCheckinRepository.update(checkinId, {
      questions: analysis.questions,
      openingRemark: analysis.openingRemark,
      status: 'COMPLETED',
      modelVersion: aiSettings.aiModelPreference
    })

    return {
      success: true,
      questions: analysis.questions
    }
  } catch (error: any) {
    if (checkinId) {
      await dailyCheckinRepository.update(checkinId, {
        status: 'FAILED'
      })
    }
    throw error
  }
}

// Automatically register task handler for Redis worker execution
registerTaskHandler('generate-daily-checkin', runGenerateDailyCheckin)
