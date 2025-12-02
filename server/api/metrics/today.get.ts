import { getServerSession } from '#auth'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  
  if (!session?.user) {
    throw createError({ 
      statusCode: 401,
      message: 'Unauthorized' 
    })
  }
  
  const today = new Date()
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  
  const metric = await prisma.wellness.findUnique({
    where: {
      userId_date: {
        userId: (session.user as any).id,
        date: todayDateOnly
      }
    }
  })
  
  return metric
})