import { prisma } from '../db'
import { wellnessRepository } from '../repositories/wellnessRepository'
import { formatUserDate } from '../date'

export interface WellnessEventOverlay {
  id: string
  label: string
  kind: string
  source: 'wellness_tag' | 'calendar_note'
  startDate: Date
  endDate: Date
  color: string
  description?: string | null
}

type WellnessEntryInput = {
  id: string
  date: Date
  tags?: string | null
  comments?: string | null
}

type CalendarNoteInput = {
  id: string
  title: string
  description?: string | null
  category?: string | null
  startDate: Date
  endDate?: Date | null
  source?: string | null
}

const WELLNESS_CATEGORY_LABELS: Record<string, string> = {
  SICK: 'Sick',
  INJURED: 'Injured',
  HOLIDAY: 'Holiday',
  NOTE: 'Note'
}

const WELLNESS_EVENT_KEYWORDS = [
  'sick',
  'ill',
  'illness',
  'injur',
  'travel',
  'holiday',
  'vacation',
  'alcohol',
  'stress',
  'migraine',
  'menstrual',
  'recovery'
]

const EVENT_COLORS: Record<string, string> = {
  sick: 'rgba(239, 68, 68, 0.16)',
  injured: 'rgba(249, 115, 22, 0.16)',
  injury: 'rgba(249, 115, 22, 0.16)',
  travel: 'rgba(14, 165, 233, 0.14)',
  holiday: 'rgba(59, 130, 246, 0.12)',
  alcohol: 'rgba(168, 85, 247, 0.14)',
  stress: 'rgba(245, 158, 11, 0.14)',
  migraine: 'rgba(236, 72, 153, 0.14)',
  menstrual: 'rgba(244, 114, 182, 0.14)',
  recovery: 'rgba(16, 185, 129, 0.14)',
  note: 'rgba(148, 163, 184, 0.12)'
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function titleCaseTag(tag: string) {
  return tag
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function normalizeEventKind(label: string) {
  const value = label.trim().toLowerCase()

  if (value.includes('sick') || value.includes('ill')) return 'sick'
  if (value.includes('injur')) return 'injured'
  if (value.includes('travel')) return 'travel'
  if (value.includes('holiday') || value.includes('vacation')) return 'holiday'
  if (value.includes('alcohol')) return 'alcohol'
  if (value.includes('stress')) return 'stress'
  if (value.includes('migraine')) return 'migraine'
  if (value.includes('menstrual') || value.includes('period')) return 'menstrual'
  if (value.includes('recovery')) return 'recovery'

  return 'note'
}

function eventColorForLabel(label: string) {
  const kind = normalizeEventKind(label)
  return EVENT_COLORS[kind] ?? EVENT_COLORS.note ?? 'rgba(148, 163, 184, 0.12)'
}

function parseWellnessTags(tags: string | null | undefined) {
  if (!tags) return []

  return tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function isWellnessCalendarNote(note: CalendarNoteInput) {
  const category = `${note.category || ''}`.toUpperCase()
  const text = `${note.title} ${note.description || ''}`.toLowerCase()

  if (['SICK', 'INJURED', 'HOLIDAY'].includes(category)) return true
  return WELLNESS_EVENT_KEYWORDS.some((keyword) => text.includes(keyword))
}

function mergeAdjacentSingleDayEvents(events: WellnessEventOverlay[]) {
  const sorted = [...events].sort((left, right) => {
    const startDelta = left.startDate.getTime() - right.startDate.getTime()
    if (startDelta !== 0) return startDelta

    return left.label.localeCompare(right.label)
  })

  const merged: WellnessEventOverlay[] = []

  for (const event of sorted) {
    const previous = merged[merged.length - 1]
    const dayGap = previous
      ? Math.round((event.startDate.getTime() - previous.endDate.getTime()) / 86400000)
      : null

    if (
      previous &&
      previous.source === event.source &&
      previous.label === event.label &&
      dayGap !== null &&
      dayGap <= 1
    ) {
      previous.endDate = event.endDate
      previous.description = previous.description || event.description
      continue
    }

    merged.push({ ...event })
  }

  return merged
}

export function buildWellnessEventOverlays(input: {
  wellnessEntries?: WellnessEntryInput[]
  calendarNotes?: CalendarNoteInput[]
}) {
  const overlayEvents: WellnessEventOverlay[] = []

  for (const entry of input.wellnessEntries || []) {
    for (const rawTag of parseWellnessTags(entry.tags)) {
      const label = titleCaseTag(rawTag)
      const id = `wellness:${entry.id}:${label.toLowerCase()}`
      const startDate = startOfUtcDay(entry.date)

      overlayEvents.push({
        id,
        label,
        kind: normalizeEventKind(label),
        source: 'wellness_tag',
        startDate,
        endDate: startDate,
        color: eventColorForLabel(label),
        description: entry.comments || null
      })
    }
  }

  for (const note of input.calendarNotes || []) {
    if (!isWellnessCalendarNote(note)) continue

    const label =
      WELLNESS_CATEGORY_LABELS[`${note.category || ''}`.toUpperCase()] || titleCaseTag(note.title)
    const startDate = startOfUtcDay(note.startDate)
    const endDate = startOfUtcDay(note.endDate || note.startDate)

    overlayEvents.push({
      id: `calendar:${note.id}`,
      label,
      kind: normalizeEventKind(label),
      source: 'calendar_note',
      startDate,
      endDate,
      color: eventColorForLabel(label),
      description: note.description || null
    })
  }

  const mergedDailyEvents = mergeAdjacentSingleDayEvents(
    overlayEvents.filter((event) => event.source === 'wellness_tag')
  )

  const rangedEvents = overlayEvents.filter((event) => event.source === 'calendar_note')

  const deduped = [...mergedDailyEvents, ...rangedEvents].filter((event, index, events) => {
    return (
      index ===
      events.findIndex(
        (candidate) =>
          candidate.label === event.label &&
          candidate.startDate.getTime() === event.startDate.getTime() &&
          candidate.endDate.getTime() === event.endDate.getTime()
      )
    )
  })

  return deduped.sort((left, right) => left.startDate.getTime() - right.startDate.getTime())
}

export async function getWellnessEventOverlaysForUser(
  userId: string,
  options: {
    startDate: Date
    endDate: Date
  }
) {
  const [wellnessEntries, calendarNotes] = await Promise.all([
    wellnessRepository.getForUser(userId, {
      startDate: options.startDate,
      endDate: options.endDate,
      orderBy: { date: 'asc' },
      select: {
        id: true,
        date: true,
        tags: true,
        comments: true
      }
    }),
    prisma.calendarNote.findMany({
      where: {
        userId,
        AND: [
          { startDate: { lte: options.endDate } },
          {
            OR: [{ endDate: null }, { endDate: { gte: options.startDate } }]
          }
        ]
      },
      orderBy: { startDate: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        startDate: true,
        endDate: true,
        source: true
      }
    })
  ])

  return buildWellnessEventOverlays({
    wellnessEntries,
    calendarNotes
  })
}

export function formatWellnessEventsForPrompt(
  events: WellnessEventOverlay[],
  timezone: string,
  heading = 'WELLNESS EVENTS'
) {
  if (events.length === 0) return ''

  const lines = events.map((event) => {
    const start = formatUserDate(event.startDate, timezone, 'yyyy-MM-dd')
    const end = formatUserDate(event.endDate, timezone, 'yyyy-MM-dd')
    const range = start === end ? start : `${start} to ${end}`
    const description = event.description ? ` | Context: ${event.description}` : ''
    return `- ${range}: ${event.label}${description}`
  })

  return `
${heading}:
${lines.join('\n')}
`
}

export function getActiveWellnessEventsForDate(events: WellnessEventOverlay[], date: Date) {
  const target = startOfUtcDay(date).getTime()

  return events.filter((event) => {
    return event.startDate.getTime() <= target && event.endDate.getTime() >= target
  })
}
