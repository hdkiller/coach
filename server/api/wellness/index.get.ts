import { getServerSession } from '#auth'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  
  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  try {
    const userId = (session.user as any).id
    console.log('Fetching wellness data for user:', userId)
    
    const wellness = await prisma.wellness.findMany({
      where: {
        userId
      },
      orderBy: {
        date: 'desc'
      },
      take: 90 // Last 90 days
    })

    console.log(`Found ${wellness.length} wellness records`)
    if (wellness.length > 0) {
      console.log('First 3 wellness records:', JSON.stringify(wellness.slice(0, 3).map(w => ({
        date: w.date,
        hrv: w.hrv,
        restingHr: w.restingHr,
        recoveryScore: w.recoveryScore,
        spO2: w.spO2
      })), null, 2))
    }

    return wellness
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch wellness data'
    })
  }
})