/**
 * Intervals calendar notes use an exclusive end boundary for all-day ranges:
 * start=2026-02-11T00:00:00, end=2026-02-15T00:00:00 means Feb 11-14.
 * This helper returns the inclusive display end date used by UI rendering.
 */
export function getCalendarNoteDisplayEndDate(note: {
  startDate: Date
  endDate?: Date | null
  source?: string | null
  rawJson?: any
}): Date | null {
  if (!note.endDate) return null

  const displayEnd = new Date(note.endDate)
  const rawEnd = note.rawJson?.end_date_local

  const isIntervalsAllDayExclusive =
    note.source === 'intervals' &&
    typeof rawEnd === 'string' &&
    /^\d{4}-\d{2}-\d{2}T00:00:00(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/.test(rawEnd)

  if (isIntervalsAllDayExclusive) {
    displayEnd.setUTCDate(displayEnd.getUTCDate() - 1)
  }

  if (displayEnd.getTime() < note.startDate.getTime()) {
    return new Date(note.startDate)
  }

  return displayEnd
}
