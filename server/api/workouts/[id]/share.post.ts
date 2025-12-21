import { v4 as uuidv4 } from 'uuid'
import { getServerSession } from '#auth'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const workoutId = getRouterParam(event, 'id')
  const { action } = await readBody(event)

  if (!workoutId) {
    throw createError({ statusCode: 400, message: 'Workout ID required' })
  }

  const userId = (session.user as any).id

  // Verify ownership
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId, userId }
  })

  if (!workout) {
    throw createError({ statusCode: 404, message: 'Workout not found' })
  }

  if (action === 'generate') {
    // Generate or return existing token
    if (workout.shareToken) {
      return { token: workout.shareToken }
    }

    const token = uuidv4()
    const updated = await prisma.workout.update({
      where: { id: workoutId },
      data: { shareToken: token }
    })
    return { token: updated.shareToken }
  } 
  
  if (action === 'revoke') {
    await prisma.workout.update({
      where: { id: workoutId },
      data: { shareToken: null }
    })
    return { success: true }
  }

  throw createError({ statusCode: 400, message: 'Invalid action' })
})
