import { requireAuth } from '../../utils/auth-guard'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, [])

  try {
    const feedbackList = await prisma.coachFeedback.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })

    return {
      status: 'success',
      data: feedbackList
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch coach feedback'
    })
  }
})
