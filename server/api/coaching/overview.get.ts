import { requireAuth } from '../../utils/auth-guard'
import { coachingRepository } from '../../utils/repositories/coachingRepository'
import { workoutRepository } from '../../utils/repositories/workoutRepository'
import { getWorkoutIcon } from '../../utils/activity-types'
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay } from 'date-fns'

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

  // 1. Get all athletes for this coach
  const athleteRelationships = await coachingRepository.getAthletesForCoach(coachId)
  if (athleteRelationships.length === 0) {
    return {
      athletes: [],
      feed: [],
      weekDays: []
    }
  }

  const athleteIds = athleteRelationships.map((rel) => rel.athlete.id)

  // 2. Define current week range (Monday to Sunday)
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }) // Sunday
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // 3. Fetch data for all athletes in parallel
  // Note: For performance in large rosters, we might want to optimize this to few bulk queries.
  // For now, keeping it simple.

  const [allWorkouts, allPlanned] = await Promise.all([
    prisma.workout.findMany({
      where: {
        userId: { in: athleteIds },
        date: { gte: weekStart, lte: weekEnd },
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
        date: { gte: weekStart, lte: weekEnd },
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

  // 4. Build Compliance Grid
  const athletesWithCompliance = await Promise.all(
    athleteRelationships.map(async (rel) => {
      const athlete = rel.athlete

      // Add enriched data for the AthleteCard (expanded view)
      const enrichedAthlete = await coachingRepository.getEnrichedAthleteForCoach(
        coachId,
        athlete.id
      )

      const complianceDays = days.map((day) => {
        const dayWorkouts = allWorkouts.filter(
          (w) => w.userId === athlete.id && isSameDay(new Date(w.date), day)
        )
        const dayPlanned = allPlanned.filter(
          (p) => p.userId === athlete.id && isSameDay(new Date(p.date), day)
        )

        let status = 'empty' // empty, planned, completed, partially_completed, missed
        if (dayWorkouts.length > 0 && dayPlanned.length > 0) {
          status = 'completed'
        } else if (dayWorkouts.length > 0) {
          status = 'unscheduled_completed'
        } else if (dayPlanned.length > 0) {
          const isPast = day < new Date(new Date().setHours(0, 0, 0, 0))
          status = isPast ? 'missed' : 'planned'
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
        fullData: enrichedAthlete || athlete
      }
    })
  )

  // 5. Build Feed (Recent 20 items across all athletes)
  // Reuse some logic from recent.get.ts but for multiple users
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
    link: `/workouts/${w.id}`
  }))

  return {
    athletes: athletesWithCompliance,
    feed,
    weekDays: days.map((d) => ({
      label: format(d, 'EEE'),
      date: d
    }))
  }
})
