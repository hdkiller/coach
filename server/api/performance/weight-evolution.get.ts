import { defineEventHandler, getQuery, createError } from 'h3'
import { getServerSession } from '#auth'
import { prisma } from '../../utils/db'
import { userRepository } from '../../utils/repositories/userRepository'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.email) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const query = getQuery(event)
  const months = parseInt(query.months as string) || 12

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) throw createError({ statusCode: 404, message: 'User not found' })

  const endDate = new Date()
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)

  // Fetch weight history from Wellness table
  const weightHistory = await prisma.wellness.findMany({
    where: {
      userId: user.id,
      date: {
        gte: startDate,
        lte: endDate
      },
      weight: {
        not: null
      }
    },
    select: {
      date: true,
      weight: true
    },
    orderBy: {
      date: 'asc'
    }
  })

  // Format data points
  const data = weightHistory.map(entry => ({
    date: entry.date,
    weight: entry.weight
  }))

  // Add current weight if recent history is missing or different
  // Only if current profile weight is set
  if (user.weight) {
    const lastEntry = data[data.length - 1]
    const today = new Date()
    // If no history, or last entry is old/different, append current state
    if (!lastEntry || (lastEntry.weight !== user.weight && today.getTime() - new Date(lastEntry.date).getTime() > 86400000)) {
      data.push({
        date: today,
        weight: user.weight
      })
    }
  }

  // Calculate stats
  const currentWeight = user.weight || (data.length > 0 ? data[data.length - 1].weight : null)
  const startingWeight = data.length > 0 ? data[0].weight : null
  const minWeight = data.length > 0 ? Math.min(...data.map(d => d.weight!)) : null
  const maxWeight = data.length > 0 ? Math.max(...data.map(d => d.weight!)) : null
  
  const change = startingWeight && currentWeight ? (currentWeight - startingWeight) : 0

  return {
    data,
    summary: {
      current: currentWeight,
      starting: startingWeight,
      min: minWeight,
      max: maxWeight,
      change: Math.round(change * 10) / 10,
      unit: user.weightUnits || 'kg'
    }
  }
})
