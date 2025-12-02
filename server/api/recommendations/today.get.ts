import { getServerSession } from '#auth'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  
  if (!session?.user) {
    throw createError({ 
      statusCode: 401,
      message: 'Unauthorized' 
    })
  }
  
  const userId = (session.user as any).id
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Find most recent recommendation for today
  const recommendation = await prisma.activityRecommendation.findFirst({
    where: {
      userId,
      date: today
    },
    orderBy: { createdAt: 'desc' }
  })
  
  return recommendation
})