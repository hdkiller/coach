import { defineEventHandler, createError } from 'h3'
import { prisma } from '../../utils/db'
import { getEffectiveUserId } from '../../utils/coaching'
import { requireAuth } from '../../utils/auth-guard'
import { subDays } from 'date-fns'

export default defineEventHandler(async (event) => {
  await requireAuth(event, ['workout:read'])
  const userId = await getEffectiveUserId(event)

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  // Only show sports from the last 90 days to keep it relevant
  const ninetyDaysAgo = subDays(new Date(), 90)

  const sports = await prisma.workout.findMany({
    where: {
      userId,
      isDuplicate: false,
      type: { not: null },
      date: { gte: ninetyDaysAgo }
    },
    distinct: ['type'],
    select: {
      type: true
    },
    orderBy: {
      type: 'asc'
    }
  })

  return sports.map((s) => s.type)
})
