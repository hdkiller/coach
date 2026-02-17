import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'
import { workoutRepository } from '../../utils/repositories/workoutRepository'
import { defineEventHandler, createError, getQuery } from 'h3'
import { eachDayOfInterval, format, isSameDay } from 'date-fns'
import { getUserTimezone, getStartOfYearUTC, getUserLocalDate } from '../../utils/date'

defineRouteMeta({
  openAPI: {
    tags: ['Scores'],
    summary: 'Get workout trends',
    description: 'Returns daily workout scores and trends for a specified period.',
    parameters: [
      {
        name: 'days',
        in: 'query',
        schema: { type: 'integer', default: 30 }
      },
      {
        name: 'sport',
        in: 'query',
        schema: { type: 'string' }
      }
    ],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                workouts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      date: { type: 'string', format: 'date-time' },
                      overallScore: { type: 'integer' },
                      technicalScore: { type: 'integer' },
                      effortScore: { type: 'integer' },
                      pacingScore: { type: 'integer' },
                      executionScore: { type: 'integer' },
                      isGhost: { type: 'boolean' }
                    }
                  }
                },
                summary: {
                  type: 'object',
                  properties: {
                    total: { type: 'integer' },
                    avgOverall: { type: 'number' },
                    avgTechnical: { type: 'number' },
                    avgEffort: { type: 'number' },
                    avgPacing: { type: 'number' },
                    avgExecution: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session?.user?.email) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const query = getQuery(event)
  const sport = query.sport === 'all' ? undefined : (query.sport as string)

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  const timezone = await getUserTimezone(user.id)
  const endDate = getUserLocalDate(timezone)
  let startDate = getUserLocalDate(timezone)

  if (query.days === 'YTD') {
    startDate = getStartOfYearUTC(timezone)
  } else {
    const days = parseInt(query.days as string) || 30
    startDate.setUTCDate(startDate.getUTCDate() - days)
  }

  const workouts = await workoutRepository.getForUser(user.id, {
    startDate,
    where: sport ? { type: sport } : undefined,
    orderBy: { date: 'asc' }
  })

  // Fill in missing days for smoother trends
  const filledWorkouts = []
  const allDays = eachDayOfInterval({ start: startDate, end: endDate })

  // Initialize with the first available non-zero value to avoid starting at 0
  // If no data exists in the period, it defaults to 0
  let lastOverall = workouts.find((w) => w.overallScore)?.overallScore || 0
  let lastTechnical = workouts.find((w) => w.technicalScore)?.technicalScore || 0
  let lastEffort = workouts.find((w) => w.effortScore)?.effortScore || 0
  let lastPacing = workouts.find((w) => w.pacingScore)?.pacingScore || 0
  let lastExecution = workouts.find((w) => w.executionScore)?.executionScore || 0

  for (const day of allDays) {
    const workoutOnDay = workouts.find((w) => isSameDay(new Date(w.date), day))

    if (workoutOnDay) {
      // If the workout has a score, update the running "last" value
      // If it doesn't (null/0), keep the previous value (carry forward)
      lastOverall = workoutOnDay.overallScore || lastOverall
      lastTechnical = workoutOnDay.technicalScore || lastTechnical
      lastEffort = workoutOnDay.effortScore || lastEffort
      lastPacing = workoutOnDay.pacingScore || lastPacing
      lastExecution = workoutOnDay.executionScore || lastExecution

      // Push a new object with the potentially backfilled scores
      // limiting to the fields we need to avoid circular refs or massive payloads (Fixes COACH-WATTS-6)
      filledWorkouts.push({
        id: workoutOnDay.id,
        date: workoutOnDay.date,
        overallScore: lastOverall,
        technicalScore: lastTechnical,
        effortScore: lastEffort,
        pacingScore: lastPacing,
        executionScore: lastExecution,
        isGhost: false
      })
    } else {
      // Create a "ghost" workout entry for charting continuity
      // We only include the scores for the trend line
      filledWorkouts.push({
        date: day,
        overallScore: lastOverall,
        technicalScore: lastTechnical,
        effortScore: lastEffort,
        pacingScore: lastPacing,
        executionScore: lastExecution,
        isGhost: true // Flag to identify synthesized data
      })
    }
  }

  const getAverage = (key: string) => {
    const workoutsWithScore = workouts.filter((w: any) => typeof w[key] === 'number')
    if (workoutsWithScore.length === 0) return null
    return (
      workoutsWithScore.reduce((sum: number, w: any) => sum + (w[key] || 0), 0) /
      workoutsWithScore.length
    )
  }

  return {
    workouts: filledWorkouts,
    summary: {
      total: workouts.length,
      avgOverall: getAverage('overallScore'),
      avgTechnical: getAverage('technicalScore'),
      avgEffort: getAverage('effortScore'),
      avgPacing: getAverage('pacingScore'),
      avgExecution: getAverage('executionScore')
    }
  }
})
