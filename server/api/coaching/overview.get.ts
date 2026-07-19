import { requireAuth } from '../../utils/auth-guard'
import { coachingRepository } from '../../utils/repositories/coachingRepository'
import { workoutRepository } from '../../utils/repositories/workoutRepository'
import { getWorkoutIcon } from '../../utils/activity-types'
import {
  formatDateUTC,
  getTimestampDateKey,
  getUserLocalDate,
  getUserTimezone
} from '../../utils/date'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { startOfWeek, endOfWeek, eachDayOfInterval, format, endOfDay } from 'date-fns'

defineRouteMeta({
  openAPI: {
    tags: ['Coaching'],
    summary: 'Get coaching overview',
    description:
      'Returns weekly compliance grid data and a combined activity feed for all coached athletes.',
    responses: {
      200: { description: 'Success' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const userAuth = await requireAuth(event, ['coaching:read'])
  const coachId = userAuth.id

  const [athleteRelationships, pendingRequests] = await Promise.all([
    coachingRepository.getAthletesForCoach(coachId),
    coachingRepository.getPendingCoachingRequestsForCoach(coachId)
  ])
  const pendingRequestCount = pendingRequests.length

  if (athleteRelationships.length === 0) {
    return {
      athletes: [],
      feed: [],
      weekDays: [],
      pendingRequestCount
    }
  }

  const athleteIds = athleteRelationships.map((rel) => rel.athlete.id)
  const timezone = await getUserTimezone(coachId)
  const now = new Date()
  const zonedNow = toZonedTime(now, timezone)
  const weekStartLocal = startOfWeek(zonedNow, { weekStartsOn: 1 })
  const weekEndLocal = endOfWeek(zonedNow, { weekStartsOn: 1 })
  const weekStartUtc = fromZonedTime(weekStartLocal, timezone)
  const weekEndUtc = fromZonedTime(endOfDay(weekEndLocal), timezone)
  const days = eachDayOfInterval({ start: weekStartLocal, end: weekEndLocal })
  const todayKey = formatDateUTC(getUserLocalDate(timezone, now))

  const [allWorkouts, allPlanned] = await Promise.all([
    prisma.workout.findMany({
      where: {
        userId: { in: athleteIds },
        date: { gte: weekStartUtc, lte: weekEndUtc },
        isDuplicate: false
      },
      select: {
        id: true,
        userId: true,
        date: true,
        type: true,
        title: true,
        durationSec: true,
        tss: true
      }
    }),
    prisma.plannedWorkout.findMany({
      where: {
        userId: { in: athleteIds },
        date: { gte: weekStartUtc, lte: weekEndUtc },
        category: 'WORKOUT'
      },
      select: {
        id: true,
        userId: true,
        date: true,
        type: true,
        title: true,
        completed: true
      }
    })
  ])

  const athletesWithCompliance = athleteRelationships.map((rel) => {
    const athlete = rel.athlete

    const complianceDays = days.map((day) => {
      const dayKey = format(day, 'yyyy-MM-dd')
      const dayWorkouts = allWorkouts.filter(
        (w) => w.userId === athlete.id && getTimestampDateKey(new Date(w.date), timezone) === dayKey
      )
      const dayPlanned = allPlanned.filter(
        (p) => p.userId === athlete.id && formatDateUTC(new Date(p.date)) === dayKey
      )

      let status = 'empty'
      if (dayPlanned.length > 0) {
        const allCompleted = dayPlanned.every((p) => p.completed)
        const someCompleted = dayPlanned.some((p) => p.completed)
        if (allCompleted) {
          status = 'completed'
        } else if (someCompleted || dayWorkouts.length > 0) {
          status = 'partially_completed'
        } else {
          status = dayKey < todayKey ? 'missed' : 'planned'
        }
      } else if (dayWorkouts.length > 0) {
        status = 'unscheduled_completed'
      }

      return {
        date: day,
        status,
        hasWorkout: dayWorkouts.length > 0,
        hasPlanned: dayPlanned.length > 0,
        workouts: dayWorkouts,
        planned: dayPlanned
      }
    })

    return {
      id: athlete.id,
      name: athlete.name,
      image: athlete.image,
      compliance: complianceDays,
      fullData: athlete
    }
  })

  const recentWorkouts = await workoutRepository.getForUsers(athleteIds, {
    limit: 20,
    orderBy: { date: 'desc' },
    include: {
      user: { select: { name: true, image: true } }
    }
  })

  const feed = recentWorkouts.map((w) => ({
    id: w.id,
    type: 'workout',
    athlete: {
      id: w.userId,
      name: (w as any).user?.name,
      image: (w as any).user?.image
    },
    date: w.date,
    title: w.title || 'Workout',
    activityType: w.type,
    icon: getWorkoutIcon(w.type || ''),
    description: `${Math.round(w.durationSec / 60)} min • ${w.type}`,
    link: `/coaching/calendar?athlete=${w.userId}`
  }))

  return {
    athletes: athletesWithCompliance,
    feed,
    weekDays: days.map((d) => ({
      label: format(d, 'EEE'),
      date: d
    })),
    pendingRequestCount
  }
})
