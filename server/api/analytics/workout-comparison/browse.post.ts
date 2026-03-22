import { z } from 'zod'
import { requireAuth } from '../../../utils/auth-guard'
import { coachingRepository } from '../../../utils/repositories/coachingRepository'
import { prisma } from '../../../utils/db'

const schema = z.object({
  search: z.string().optional(),
  athleteIds: z.array(z.string()).optional(),
  type: z.string().optional(),
  source: z.string().optional(),
  startDate: z.union([z.string(), z.date()]).pipe(z.coerce.date()).optional(),
  endDate: z.union([z.string(), z.date()]).pipe(z.coerce.date()).optional(),
  limit: z.number().int().min(1).max(200).optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const result = schema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid workout browser filters',
      data: result.error.issues
    })
  }

  const filters = result.data
  const coachedAthletes = await coachingRepository.getAthletesForCoach(user.id).catch(() => [])
  const accessibleAthletes = coachedAthletes.map((relationship: any) => relationship.athlete)
  const accessibleUserIds = Array.from(
    new Set([user.id, ...accessibleAthletes.map((athlete: any) => athlete.id)])
  )

  const selectedAthleteIds =
    filters.athleteIds && filters.athleteIds.length > 0
      ? filters.athleteIds.filter((athleteId) => accessibleUserIds.includes(athleteId))
      : accessibleUserIds

  const search = filters.search?.trim()

  const workouts = await prisma.workout.findMany({
    where: {
      userId: { in: selectedAthleteIds },
      isDuplicate: false,
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.source ? { source: filters.source } : {}),
      ...(filters.startDate || filters.endDate
        ? {
            date: {
              ...(filters.startDate ? { gte: filters.startDate } : {}),
              ...(filters.endDate ? { lte: filters.endDate } : {})
            }
          }
        : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { type: { contains: search, mode: 'insensitive' } },
              { user: { name: { contains: search, mode: 'insensitive' } } },
              { user: { email: { contains: search, mode: 'insensitive' } } }
            ]
          }
        : {})
    },
    orderBy: { date: 'desc' },
    take: filters.limit || 80,
    select: {
      id: true,
      userId: true,
      date: true,
      title: true,
      type: true,
      source: true,
      durationSec: true,
      distanceMeters: true,
      averageWatts: true,
      normalizedPower: true,
      averageHr: true,
      tss: true,
      trainingLoad: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true
        }
      }
    }
  })

  return {
    athletes: [
      {
        id: user.id,
        name: 'My Data',
        email: user.email,
        image: null,
        isSelf: true
      },
      ...accessibleAthletes.map((athlete: any) => ({
        id: athlete.id,
        name: athlete.name,
        email: athlete.email,
        image: athlete.image,
        isSelf: athlete.id === user.id
      }))
    ],
    workouts
  }
})
