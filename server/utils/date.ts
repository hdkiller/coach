import { toZonedTime, fromZonedTime, format } from 'date-fns-tz'
import { addDays, startOfDay, endOfDay, subDays, startOfYear, differenceInYears } from 'date-fns'
import { prisma } from './db'

export const DEFAULT_TIMEZONE = 'UTC'
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
}

/**
 * Calculate age from Date of Birth
 */
export function calculateAge(dob: Date | null | undefined): number | null {
  if (!dob) return null
  return differenceInYears(new Date(), new Date(dob))
}

/**
 * Fetch a user's timezone, defaulting to UTC
 */
export async function getUserTimezone(userId: string): Promise<string> {
  if (!userId) return DEFAULT_TIMEZONE

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true }
  })
  return user?.timezone || DEFAULT_TIMEZONE
}

/**
 * Get the start of the day in UTC for a specific timezone.
 * Useful for DB queries: "Give me all records that happened 'today' in Tokyo"
 *
 * Example:
 * If it's 10:00 AM UTC (19:00 Tokyo), getting start of day for Tokyo
 * will return 15:00 UTC previous day (00:00 Tokyo).
 */
export function getStartOfDayUTC(timezone: string, date: Date = new Date()): Date {
  try {
    // Convert UTC date to Zoned Time
    const zonedDate = toZonedTime(date, timezone)
    // Get start of day in that zone (keeps the "face value" time but is just a Date struct)
    const zonedStart = startOfDay(zonedDate)
    // Convert that "face value" start time back to a real UTC timestamp
    return fromZonedTime(zonedStart, timezone)
  } catch (e) {
    console.warn(`[DateUtil] Invalid timezone '${timezone}', falling back to UTC`)
    return startOfDay(date)
  }
}

/**
 * Get the end of the day in UTC for a specific timezone.
 */
export function getEndOfDayUTC(timezone: string, date: Date = new Date()): Date {
  try {
    const zonedDate = toZonedTime(date, timezone)
    const zonedEnd = endOfDay(zonedDate)
    return fromZonedTime(zonedEnd, timezone)
  } catch (e) {
    console.warn(`[DateUtil] Invalid timezone '${timezone}', falling back to UTC`)
    return endOfDay(date)
  }
}

/**
 * Get the start of the day N days ago in UTC for a specific timezone.
 */
export function getStartOfDaysAgoUTC(
  timezone: string,
  days: number,
  date: Date = new Date()
): Date {
  try {
    const zonedDate = toZonedTime(date, timezone)
    const pastDate = subDays(zonedDate, days)
    const zonedStart = startOfDay(pastDate)
    return fromZonedTime(zonedStart, timezone)
  } catch (e) {
    return startOfDay(subDays(date, days))
  }
}

/**
 * Get the start of the current year in UTC for a specific timezone.
 */
export function getStartOfYearUTC(timezone: string, date: Date = new Date()): Date {
  try {
    const zonedDate = toZonedTime(date, timezone)
    const zonedStart = startOfYear(zonedDate)
    return fromZonedTime(zonedStart, timezone)
  } catch (e) {
    return startOfYear(date)
  }
}

/**
 * Format a date in the user's timezone
 */
export function formatUserTime(date: Date, timezone: string, formatStr: string = 'HH:mm'): string {
  try {
    return format(toZonedTime(date, timezone), formatStr)
  } catch (e) {
    return format(date, formatStr)
  }
}

/**
 * Format a full date in the user's timezone
 */
export function formatUserDate(
  date: Date,
  timezone: string,
  formatStr: string = 'yyyy-MM-dd'
): string {
  try {
    return format(toZonedTime(date, timezone), formatStr)
  } catch (e) {
    return format(date, formatStr)
  }
}

/**
 * Get the local calendar day key for a timestamped record.
 * Timestamped entities like completed workouts should be grouped by the user's local day.
 */
export function getTimestampDateKey(date: Date, timezone: string): string {
  return formatUserDate(date, timezone, 'yyyy-MM-dd')
}

/**
 * Format a date in UTC.
 * Useful for displaying dates that are stored as UTC Midnight (e.g. PlannedWorkout.date)
 * without shifting them to the user's timezone.
 */
export function formatDateUTC(date: Date, formatStr: string = 'yyyy-MM-dd'): string {
  return format(date, formatStr, { timeZone: 'UTC' })
}

export function parseCalendarDate(dateStr: string): Date | null {
  if (!ISO_DATE_RE.test(dateStr)) return null

  const parsed = new Date(`${dateStr}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return null

  return formatDateUTC(parsed, 'yyyy-MM-dd') === dateStr ? parsed : null
}

export function isValidCalendarDate(dateStr: string): boolean {
  return parseCalendarDate(dateStr) !== null
}

export function buildInvalidCalendarDateResult(
  field: string,
  value: string,
  attemptedInput?: Record<string, unknown>
) {
  return {
    success: false,
    error_code: 'INVALID_CALENDAR_DATE',
    error: `Invalid calendar date for ${field}: ${value}. Expected YYYY-MM-DD and a real calendar day.`,
    invalid_payload: attemptedInput || { [field]: value }
  }
}

const shiftUtcCalendarDate = (date: Date, days: number) => {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

const resolveWeekdayReference = (
  baseDate: Date,
  weekday: string,
  qualifier: 'this' | 'next' | 'last'
) => {
  const targetDay = WEEKDAY_INDEX[weekday.toLowerCase()]
  if (targetDay === undefined) return null

  const currentDay = baseDate.getUTCDay()
  let delta = targetDay - currentDay

  if (qualifier === 'next') {
    if (delta <= 0) delta += 7
  } else if (qualifier === 'last') {
    if (delta >= 0) delta -= 7
  }

  return shiftUtcCalendarDate(baseDate, delta)
}

const resolveBareWeekdayReference = (baseDate: Date, weekday: string) => {
  const targetDay = WEEKDAY_INDEX[weekday.toLowerCase()]
  if (targetDay === undefined) return null

  const currentDay = baseDate.getUTCDay()
  let delta = targetDay - currentDay

  // Bare weekday names are interpreted as the next upcoming occurrence,
  // including today when it already matches.
  if (delta < 0) delta += 7

  return shiftUtcCalendarDate(baseDate, delta)
}

export function resolveRelativeDateReference(
  reference: string,
  timezone: string,
  baseDateInput?: string
) {
  const baseDate =
    typeof baseDateInput === 'string' && baseDateInput.trim()
      ? parseCalendarDate(baseDateInput)
      : getUserLocalDate(timezone)

  if (!baseDate) {
    return {
      success: false as const,
      error_code: 'INVALID_BASE_DATE',
      error: `Invalid base_date: ${baseDateInput}. Expected YYYY-MM-DD and a real calendar day.`
    }
  }

  const normalized = reference.trim().toLowerCase().replace(/\s+/g, ' ')
  let resolvedDate: Date | null = null
  let assumedTimeOfDay: string | undefined

  if (normalized === 'today') resolvedDate = baseDate
  else if (normalized === 'tomorrow') resolvedDate = shiftUtcCalendarDate(baseDate, 1)
  else if (normalized === 'yesterday' || normalized === 'last night') {
    resolvedDate = shiftUtcCalendarDate(baseDate, -1)
    if (normalized === 'last night') assumedTimeOfDay = 'evening'
  } else if (normalized === 'day before yesterday') {
    resolvedDate = shiftUtcCalendarDate(baseDate, -2)
  } else if (normalized === 'tonight') {
    resolvedDate = baseDate
    assumedTimeOfDay = 'evening'
  } else if (normalized === 'this morning') {
    resolvedDate = baseDate
    assumedTimeOfDay = 'morning'
  } else if (normalized === 'this afternoon') {
    resolvedDate = baseDate
    assumedTimeOfDay = 'afternoon'
  } else if (normalized === 'this evening') {
    resolvedDate = baseDate
    assumedTimeOfDay = 'evening'
  } else {
    const weekdayMatch = normalized.match(
      /^(this|next|last) (monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/
    )
    if (weekdayMatch) {
      resolvedDate = resolveWeekdayReference(
        baseDate,
        weekdayMatch[2]!,
        weekdayMatch[1]! as 'this' | 'next' | 'last'
      )
    } else if (WEEKDAY_INDEX[normalized] !== undefined) {
      resolvedDate = resolveBareWeekdayReference(baseDate, normalized)
    }
  }

  if (!resolvedDate) {
    return {
      success: false as const,
      error_code: 'UNSUPPORTED_TEMPORAL_REFERENCE',
      error: `Unsupported temporal reference: "${reference}".`
    }
  }

  return {
    success: true as const,
    resolvedDate,
    resolvedDateString: formatDateUTC(resolvedDate, 'yyyy-MM-dd'),
    baseDate,
    baseDateString: formatDateUTC(baseDate, 'yyyy-MM-dd'),
    assumedTimeOfDay
  }
}

export function adjustCalendarDate(baseDateInput: string, amount: number) {
  const baseDate = parseCalendarDate(baseDateInput)
  if (!baseDate) {
    return {
      success: false as const,
      error_code: 'INVALID_BASE_DATE',
      error: `Invalid base_date: ${baseDateInput}. Expected YYYY-MM-DD and a real calendar day.`
    }
  }

  const resolvedDate = addDays(baseDate, amount)
  return {
    success: true as const,
    resolvedDate,
    resolvedDateString: formatDateUTC(resolvedDate, 'yyyy-MM-dd'),
    baseDate,
    baseDateString: formatDateUTC(baseDate, 'yyyy-MM-dd')
  }
}

/**
 * Build a UTC Date from a stored UTC-midnight date and a local HH:mm time.
 * This preserves the user's intended local clock time across timezones.
 */
export function buildZonedDateTimeFromUtcDate(
  date: Date,
  time: string | null | undefined,
  timezone: string,
  fallbackHour: number = 10,
  fallbackMinute: number = 0
): Date {
  let hour = fallbackHour
  let minute = fallbackMinute

  if (time && time.includes(':')) {
    const [h, m] = time.split(':').map(Number)
    if (typeof h === 'number' && Number.isFinite(h)) hour = h
    if (typeof m === 'number' && Number.isFinite(m)) minute = m
  }

  const dateStr = formatDateUTC(date, 'yyyy-MM-dd')
  const hh = String(hour).padStart(2, '0')
  const mm = String(minute).padStart(2, '0')
  const localDate = new Date(`${dateStr}T${hh}:${mm}:00`)

  try {
    return fromZonedTime(localDate, timezone)
  } catch (e) {
    return localDate
  }
}

/**
 * Get the user's current local date as a Date object set to UTC midnight.
 * This is useful for querying Prisma @db.Date columns.
 */
export function getUserLocalDate(timezone: string = 'UTC', date: Date = new Date()): Date {
  try {
    const dateStr = format(toZonedTime(date, timezone), 'yyyy-MM-dd')
    return new Date(`${dateStr}T00:00:00Z`)
  } catch (e) {
    // Fallback using provided date or now
    const d = date || new Date()
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  }
}

/**
 * Convert a calendar date string (YYYY-MM-DD) to a UTC timestamp
 * representing the start of that day in the user's timezone.
 */
export function getStartOfLocalDateUTC(timezone: string, dateStr: string): Date {
  try {
    return fromZonedTime(`${dateStr}T00:00:00`, timezone)
  } catch (e) {
    return new Date(`${dateStr}T00:00:00Z`)
  }
}

/**
 * Convert a calendar date string (YYYY-MM-DD) to a UTC timestamp
 * representing the end of that day in the user's timezone.
 */
export function getEndOfLocalDateUTC(timezone: string, dateStr: string): Date {
  try {
    return fromZonedTime(`${dateStr}T23:59:59.999`, timezone)
  } catch (e) {
    return new Date(`${dateStr}T23:59:59.999Z`)
  }
}
