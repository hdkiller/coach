import { format, toZonedTime } from 'date-fns-tz'
import type { CalendarActivity } from '../../types/calendar'

export interface CalendarResponse {
  activities?: CalendarActivity[]
  nutritionByDate?: Record<string, unknown>
  wellnessByDate?: Record<string, unknown>
}

function formatUtcDateKey(date: string | Date): string {
  return format(toZonedTime(new Date(date), 'UTC'), 'yyyy-MM-dd', { timeZone: 'UTC' })
}

function formatLocalDateKey(date: string | Date, timezone: string): string {
  return format(toZonedTime(new Date(date), timezone), 'yyyy-MM-dd')
}

export function getCalendarActivityDateKey(
  activity: Pick<CalendarActivity, 'source' | 'date'>,
  timezone: string
): string {
  if (activity.source === 'completed') {
    return formatLocalDateKey(activity.date, timezone)
  }

  return formatUtcDateKey(activity.date)
}

export function getCalendarActivities(
  response: CalendarActivity[] | CalendarResponse | null | undefined
): CalendarActivity[] {
  if (Array.isArray(response)) {
    return response
  }

  if (Array.isArray(response?.activities)) {
    return response.activities
  }

  return []
}
