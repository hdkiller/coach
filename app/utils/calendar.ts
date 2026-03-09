import { format, toZonedTime } from 'date-fns-tz'
import type { CalendarActivity } from '../../types/calendar'

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
