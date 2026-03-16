import { prisma } from '../db'
import { formatUserDate } from '../date'
import { dailyCheckinRepository } from '../repositories/dailyCheckinRepository'
import { getWellnessEventOverlaysForUser, type WellnessEventOverlay } from './wellnessEventService'

export type RecoveryContextKind = 'wellness' | 'journey_event' | 'daily_checkin'
export type RecoveryContextSourceType = 'imported' | 'manual_event' | 'daily_checkin'
export type RecoveryContextOverlayStyle = 'band' | 'marker'

export interface RecoveryContextQuestionSummary {
  id: string
  text: string
  answer: string | null
}

export interface RecoveryContextItem {
  id: string
  sourceRecordId: string
  kind: RecoveryContextKind
  sourceType: RecoveryContextSourceType
  label: string
  description: string | null
  severity: number | null
  startAt: Date
  endAt: Date
  isRange: boolean
  editable: boolean
  deletable: boolean
  color: string
  icon: string
  overlayStyle: RecoveryContextOverlayStyle
  origin: string
  category: string | null
  rawAnswerSummary?: RecoveryContextQuestionSummary[]
  userNotes?: string | null
  metadata?: Record<string, unknown>
}

const JOURNEY_CATEGORY_META: Record<
  string,
  { label: string; color: string; icon: string; shortLabel: string }
> = {
  GI_DISTRESS: {
    label: 'GI Distress',
    shortLabel: 'GI Distress',
    color: 'rgba(249, 115, 22, 0.18)',
    icon: 'i-lucide-shell'
  },
  MUSCLE_PAIN: {
    label: 'Muscle Pain',
    shortLabel: 'Muscle Pain',
    color: 'rgba(239, 68, 68, 0.18)',
    icon: 'i-lucide-activity'
  },
  FATIGUE: {
    label: 'Fatigue',
    shortLabel: 'Fatigue',
    color: 'rgba(99, 102, 241, 0.18)',
    icon: 'i-lucide-battery-warning'
  },
  SLEEP: {
    label: 'Sleep Issue',
    shortLabel: 'Sleep',
    color: 'rgba(59, 130, 246, 0.18)',
    icon: 'i-lucide-moon-star'
  },
  MOOD: {
    label: 'Mood Shift',
    shortLabel: 'Mood',
    color: 'rgba(236, 72, 153, 0.18)',
    icon: 'i-lucide-smile-plus'
  },
  CRAMPING: {
    label: 'Cramping',
    shortLabel: 'Cramping',
    color: 'rgba(245, 158, 11, 0.18)',
    icon: 'i-lucide-zap'
  },
  DIZZINESS: {
    label: 'Dizziness',
    shortLabel: 'Dizziness',
    color: 'rgba(234, 179, 8, 0.18)',
    icon: 'i-lucide-orbit'
  },
  HUNGER: {
    label: 'Hunger',
    shortLabel: 'Hunger',
    color: 'rgba(59, 130, 246, 0.18)',
    icon: 'i-lucide-utensils-crossed'
  }
}

function summarizeCheckinQuestions(questions: unknown): RecoveryContextQuestionSummary[] {
  if (!Array.isArray(questions)) return []

  return questions
    .map((question: any) => ({
      id: String(question?.id || ''),
      text: String(question?.text || 'Question'),
      answer: question?.answer ? String(question.answer) : null
    }))
    .filter((question) => question.id)
}

function buildCheckinDescription(
  questionSummary: RecoveryContextQuestionSummary[],
  userNotes?: string | null
) {
  const answered = questionSummary.filter((question) => question.answer)
  const summary = answered
    .slice(0, 2)
    .map((question) => `${question.text}: ${question.answer}`)
    .join(' • ')

  if (summary && userNotes) return `${summary} • Notes: ${userNotes}`
  if (summary) return summary
  return userNotes || 'Submitted via daily check-in'
}

function mapWellnessOverlayToRecoveryItem(event: WellnessEventOverlay): RecoveryContextItem {
  return {
    id: `recovery:${event.id}`,
    sourceRecordId: event.id,
    kind: 'wellness',
    sourceType: 'imported',
    label: event.label,
    description: event.description || null,
    severity: null,
    startAt: event.startDate,
    endAt: event.endDate,
    isRange: event.startDate.getTime() !== event.endDate.getTime(),
    editable: false,
    deletable: false,
    color: event.color,
    icon: 'i-lucide-cloud-download',
    overlayStyle: 'band',
    origin:
      event.source === 'calendar_note'
        ? 'Imported from Intervals calendar'
        : 'Imported from Intervals wellness',
    category: event.kind
  }
}

export async function getRecoveryContextItemsForUser(
  userId: string,
  options: {
    startDate: Date
    endDate: Date
  }
) {
  const [wellnessEvents, journeyEvents, checkins] = await Promise.all([
    getWellnessEventOverlaysForUser(userId, options),
    prisma.athleteJourneyEvent.findMany({
      where: {
        userId,
        timestamp: {
          gte: options.startDate,
          lte: options.endDate
        }
      },
      orderBy: { timestamp: 'desc' }
    }),
    dailyCheckinRepository.getHistoryDetailed(userId, options.startDate, options.endDate)
  ])

  const items: RecoveryContextItem[] = wellnessEvents.map(mapWellnessOverlayToRecoveryItem)

  for (const event of journeyEvents) {
    const meta = JOURNEY_CATEGORY_META[event.category] || {
      label: event.category,
      shortLabel: event.category,
      color: 'rgba(148, 163, 184, 0.18)',
      icon: 'i-lucide-heart-pulse'
    }

    items.push({
      id: `recovery:journey:${event.id}`,
      sourceRecordId: event.id,
      kind: 'journey_event',
      sourceType: 'manual_event',
      label: `${meta.shortLabel} ${event.severity}/10`,
      description: event.description || 'Logged manually',
      severity: event.severity,
      startAt: event.timestamp,
      endAt: event.timestamp,
      isRange: false,
      editable: true,
      deletable: true,
      color: meta.color,
      icon: meta.icon,
      overlayStyle: 'marker',
      origin: 'Logged manually',
      category: event.category,
      metadata: {
        eventType: event.eventType,
        metabolicSnapshot: event.metabolicSnapshot,
        suspectedTriggerId: event.suspectedTriggerId
      }
    })
  }

  for (const checkin of checkins) {
    const questionSummary = summarizeCheckinQuestions(checkin.questions)

    items.push({
      id: `recovery:checkin:${checkin.id}`,
      sourceRecordId: checkin.id,
      kind: 'daily_checkin',
      sourceType: 'daily_checkin',
      label: 'Daily Check-in',
      description: buildCheckinDescription(questionSummary, checkin.userNotes),
      severity: null,
      startAt: checkin.date,
      endAt: checkin.date,
      isRange: false,
      editable: true,
      deletable: true,
      color: 'rgba(20, 184, 166, 0.16)',
      icon: 'i-lucide-clipboard-check',
      overlayStyle: 'marker',
      origin: 'Submitted via daily check-in',
      category: 'DAILY_CHECKIN',
      rawAnswerSummary: questionSummary,
      userNotes: checkin.userNotes,
      metadata: {
        status: checkin.status,
        openingRemark: checkin.openingRemark,
        feedback: checkin.feedback,
        feedbackText: checkin.feedbackText,
        llmUsageId: checkin.llmUsageId
      }
    })
  }

  return items.sort((left, right) => {
    const startDelta = right.startAt.getTime() - left.startAt.getTime()
    if (startDelta !== 0) return startDelta
    return left.label.localeCompare(right.label)
  })
}

export function getActiveRecoveryContextForDate(items: RecoveryContextItem[], date: Date) {
  const targetTime = date.getTime()
  const targetDateKey = date.toISOString().slice(0, 10)

  return items.filter((item) => {
    if (item.isRange) {
      return item.startAt.getTime() <= targetTime && item.endAt.getTime() >= targetTime
    }

    return item.startAt.toISOString().slice(0, 10) === targetDateKey
  })
}

export function formatRecoveryContextForPrompt(
  items: RecoveryContextItem[],
  timezone: string,
  heading = 'RECOVERY CONTEXT'
) {
  if (items.length === 0) return ''

  const lines = items.map((item) => {
    const start = formatUserDate(item.startAt, timezone, 'yyyy-MM-dd')
    const end = formatUserDate(item.endAt, timezone, 'yyyy-MM-dd')
    const dateRange = start === end ? start : `${start} to ${end}`
    const sourceLabel =
      item.sourceType === 'imported'
        ? 'Imported'
        : item.sourceType === 'manual_event'
          ? 'Manual'
          : 'Daily check-in'
    const description = item.description ? ` | Context: ${item.description}` : ''
    return `- ${dateRange}: [${sourceLabel}] ${item.label}${description}`
  })

  return `
${heading}:
${lines.join('\n')}
`
}
