interface TimeWindowOptions {
  timezone: string
  preferredTime?: string | null
  now?: Date
  windowMinutes?: number
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

function parseTimeToMinutes(value: string): number | null {
  const match = TIME_PATTERN.exec(value)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  return hours * 60 + minutes
}

function getTimeInZoneMinutes(now: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

  const parts = formatter.formatToParts(now)
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')

  return hour * 60 + minute
}

export function isWithinPreferredEmailTime({
  timezone,
  preferredTime,
  now = new Date(),
  windowMinutes = 59
}: TimeWindowOptions): boolean {
  if (!preferredTime) return true

  const preferredMinutes = parseTimeToMinutes(preferredTime)
  if (preferredMinutes === null) return true

  const currentMinutes = getTimeInZoneMinutes(now, timezone)
  const delta = Math.abs(currentMinutes - preferredMinutes)
  const wrappedDelta = Math.min(delta, 1440 - delta)

  return wrappedDelta <= windowMinutes
}
