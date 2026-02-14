import { defineEventHandler, getQuery } from 'h3'
import { getEffectiveUserId } from '../../../utils/coaching'
import { plannedWorkoutRepository } from '../../../utils/repositories/plannedWorkoutRepository'

function parseDateOnlyUtcStart(value: string) {
  const dateOnly = value.slice(0, 10)
  const parsed = new Date(`${dateOnly}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) {
    throw createError({ statusCode: 400, message: `Invalid start date: ${value}` })
  }
  return parsed
}

function parseDateOnlyUtcEnd(value: string) {
  const dateOnly = value.slice(0, 10)
  const parsed = new Date(`${dateOnly}T23:59:59.999Z`)
  if (Number.isNaN(parsed.getTime())) {
    throw createError({ statusCode: 400, message: `Invalid end date: ${value}` })
  }
  return parsed
}

export default defineEventHandler(async (event) => {
  const userId = await getEffectiveUserId(event)
  const query = getQuery(event)

  if (!query.start || !query.end) {
    throw createError({ statusCode: 400, message: 'start and end are required' })
  }

  const startDate = parseDateOnlyUtcStart(String(query.start))
  const endDate = parseDateOnlyUtcEnd(String(query.end))

  const workouts = await plannedWorkoutRepository.list(userId, {
    startDate,
    endDate,
    where: {
      completed: false
    }
  })

  return {
    workouts: (workouts as any[]).map((workout) => ({
      id: workout.id,
      date: workout.date,
      title: workout.title,
      type: workout.type,
      durationSec: workout.durationSec,
      tss: workout.tss,
      source: workout.externalId ? 'intervals' : 'manual',
      syncStatus: workout.syncStatus
    }))
  }
})
