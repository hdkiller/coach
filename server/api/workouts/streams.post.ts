import { getServerSession } from '#auth'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  
  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }
  
  const body = await readBody(event)
  const { workoutIds } = body
  
  if (!workoutIds || !Array.isArray(workoutIds) || workoutIds.length === 0) {
    return []
  }
  
  // Verify workouts belong to user
  const workouts = await prisma.workout.findMany({
    where: {
      id: { in: workoutIds },
      userId: (session.user as any).id
    },
    select: {
      id: true
    }
  })
  
  const verifiedIds = workouts.map(w => w.id)
  
  if (verifiedIds.length === 0) {
    return []
  }
  
  // Fetch streams for verified workouts
  const streams = await prisma.workoutStream.findMany({
    where: {
      workoutId: { in: verifiedIds }
    }
  })
  
  // Map back to workout ID for easier consumption
  return streams
})