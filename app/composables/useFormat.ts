import { format, toZonedTime, fromZonedTime } from 'date-fns-tz'
import { formatDistanceToNow } from 'date-fns'
import { LBS_TO_KG } from '~/utils/metrics'

/**
 * Format a date in UTC without timezone shifting.
 * Useful for @db.Date columns which are stored as UTC midnight.
 */
export const formatDateUTC = (date: string | Date, formatStr: string = 'MMM d, yyyy') => {
  if (!date) return ''
  try {
    // Explicitly convert to UTC zone first to ensure format respects it
    // regardless of environment fallback behavior
    const utcDate = toZonedTime(new Date(date), 'UTC')
    return format(utcDate, formatStr, { timeZone: 'UTC' })
  } catch (e) {
    return ''
  }
}

/**
 * Format a date with a specific timezone (manual override)
 */
export const formatUserDate = (
  date: string | Date,
  tz: string,
  formatStr: string = 'yyyy-MM-dd'
) => {
  if (!date) return ''
  try {
    return format(toZonedTime(new Date(date), tz), formatStr)
  } catch (e) {
    return ''
  }
}

export const calculateAge = (dob: Date | string | null | undefined): number => {
  if (!dob) return 0
  try {
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  } catch (e) {
    return 0
  }
}

export const formatDuration = (seconds: number) => {
  if (!seconds) return '-'
  const hours = Math.floor(seconds / 3600)
  const mins = Math.round((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

export const useFormat = () => {
  const { data } = useAuth()

  // Reactive timezone
  const timezone = computed(() => {
    return (
      (data.value?.user as any)?.timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      'UTC'
    )
  })

  // Helper to convert date to Zoned Date
  const toZoned = (date: string | Date) => {
    return toZonedTime(new Date(date), timezone.value)
  }

  const formatDate = (date: string | Date, formatStr: string | any = 'MMM d, yyyy') => {
    if (!date) return ''
    try {
      // If formatStr is an object (legacy Intl options), ignore it or map it.
      if (typeof formatStr === 'object') {
        return new Date(date).toLocaleDateString('en-US', {
          ...(formatStr as any),
          timeZone: timezone.value
        })
      }

      return format(toZoned(date), formatStr)
    } catch (e) {
      return ''
    }
  }

  const formatShortDate = (date: string | Date) => {
    return formatDate(date, 'MMM d')
  }

  const formatDateTime = (date: string | Date, formatStr: string = 'MMM d, yyyy h:mm a') => {
    return formatDate(date, formatStr)
  }

  const formatTime = (value: string | Date, formatStr: string = 'h:mm a') => {
    if (!value) return ''
    try {
      if (typeof value === 'string') {
        const trimmed = value.trim()
        if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
          const normalized = trimmed.length === 5 ? `${trimmed}:00` : trimmed
          return format(new Date(`2000-01-01T${normalized}`), formatStr)
        }
      }

      return formatDate(value, formatStr)
    } catch (e) {
      return ''
    }
  }

  const formatRelativeTime = (date: string | Date) => {
    if (!date) return ''
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true })
    } catch (e) {
      return ''
    }
  }

  /**
   * Get the user's current local date as a Date object set to UTC midnight.
   * Useful for comparing with DB dates stored at UTC midnight.
   */
  const getUserLocalDate = (): Date => {
    try {
      const dateStr = format(toZoned(new Date()), 'yyyy-MM-dd')
      return new Date(`${dateStr}T00:00:00Z`)
    } catch (e) {
      const now = new Date()
      return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    }
  }

  /**
   * Get the user's current local time as a string (HH:mm)
   */
  const getUserLocalTime = (): string => {
    try {
      return format(toZoned(new Date()), 'HH:mm')
    } catch (e) {
      const now = new Date()
      return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    }
  }

  /**
   * Construct a Date object from a local date string (YYYY-MM-DD) and time string (HH:mm:ss)
   * interpreted in the user's timezone. Returns a standard Date object (which renders as UTC in ISO string).
   */
  const getUserDateFromLocal = (dateStr: string, timeStr: string = '00:00:00'): Date => {
    try {
      return fromZonedTime(`${dateStr}T${timeStr}`, timezone.value)
    } catch (e) {
      // Fallback to simple UTC construction if invalid
      return new Date(`${dateStr}T${timeStr}Z`)
    }
  }

  /**
   * Format weight based on user preference.
   * Assumes input weight is always in Kilograms.
   */
  const formatWeight = (
    weightKg: number | null | undefined,
    includeUnit: boolean = true,
    overrideUnits?: string
  ) => {
    if (weightKg === null || weightKg === undefined) return '-'

    const unit = overrideUnits || (data.value?.user as any)?.weightUnits || 'Kilograms'
    let value = weightKg

    if (unit === 'Pounds') {
      value = weightKg / LBS_TO_KG
    }

    const formatted = value.toFixed(1)
    return includeUnit ? `${formatted} ${unit === 'Pounds' ? 'lbs' : 'kg'}` : formatted
  }

  return {
    formatDate,
    formatDateUTC,
    formatShortDate,
    formatDateTime,
    formatTime,
    formatRelativeTime,
    formatUserDate,
    getUserLocalDate,
    getUserLocalTime,
    getUserDateFromLocal,
    calculateAge,
    formatDuration,
    formatWeight,
    timezone
  }
}
