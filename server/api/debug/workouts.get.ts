import { requireAdmin } from '../../utils/auth-guard'

export default defineEventHandler(async (event) => {
  const session = await requireAdmin(event)
  const userId = session.user.id

  const [recentWorkouts, plannedWorkouts] = await Promise.all([
    prisma.workout.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 5,
      select: { id: true, date: true, title: true, type: true }
    }),
    prisma.plannedWorkout.findMany({
      where: { userId, date: { gte: new Date() } },
      orderBy: { date: 'asc' },
      take: 5,
      select: { id: true, date: true, title: true, type: true }
    })
  ])

  return {
    recentWorkouts,
    plannedWorkouts
  }
})
