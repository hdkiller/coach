import { getUserLocalDate } from './date'

type GoalDateFields = {
  eventDate?: Date | null
  targetDate?: Date | null
}

export function filterGoalsForContext<T extends GoalDateFields>(
  goals: T[] | null | undefined,
  timezone: string = 'UTC',
  referenceDate: Date = new Date()
): T[] {
  if (!goals?.length) return []

  const localToday = getUserLocalDate(timezone, referenceDate)

  return goals.filter((goal) => {
    const relevantDate = goal.eventDate || goal.targetDate
    if (!relevantDate) return true
    return new Date(relevantDate).getTime() >= localToday.getTime()
  })
}
