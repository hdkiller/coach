import { getServerSession } from '#auth'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  
  if (!session?.user) {
    throw createError({ 
      statusCode: 401,
      message: 'Unauthorized' 
    })
  }
  
  const query = getQuery(event)
  const limit = query.limit ? parseInt(query.limit as string) : 10
  const type = query.type as string | undefined
  const beforeDate = query.beforeDate as string | undefined
  
  const where: any = {
    userId: (session.user as any).id
  }
  
  if (type) {
    where.type = type
  }
  
  // If beforeDate is provided, find profiles created on or before that date
  if (beforeDate) {
    where.createdAt = {
      lte: new Date(beforeDate)
    }
  }
  
  const reports = await prisma.report.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      type: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      dateRangeStart: true,
      dateRangeEnd: true,
      modelVersion: true,
      analysisJson: true
    }
  })
  
  return reports
})