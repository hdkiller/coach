import { getServerSession } from '#auth'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  
  if (!session?.user?.email) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }
  
  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    
    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }
    
    // Check for Intervals.icu integration
    const integration = await prisma.integration.findFirst({
      where: {
        userId: user.id,
        provider: 'intervals'
      }
    })
    
    if (!integration) {
      return {
        success: false,
        message: 'No supported integration found (Intervals.icu required)'
      }
    }
    
    // Fetch profile from Intervals.icu
    const intervalsProfile = await fetchIntervalsAthleteProfile(integration)
    
    // Prepare update data
    const updateData: any = {}
    
    if (intervalsProfile.ftp) updateData.ftp = intervalsProfile.ftp
    if (intervalsProfile.maxHR) updateData.maxHr = intervalsProfile.maxHR
    if (intervalsProfile.restingHR) updateData.restingHr = intervalsProfile.restingHR
    if (intervalsProfile.weight) updateData.weight = intervalsProfile.weight
    if (intervalsProfile.hrZones) updateData.hrZones = intervalsProfile.hrZones
    if (intervalsProfile.powerZones) updateData.powerZones = intervalsProfile.powerZones
    
    // If we found any data, update the user
    if (Object.keys(updateData).length > 0) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: updateData
      })
      
      return {
        success: true,
        message: 'Profile updated from Intervals.icu',
        updates: updateData,
        profile: updatedUser
      }
    } else {
      return {
        success: true,
        message: 'No new data found from Intervals.icu',
        updates: {}
      }
    }
    
  } catch (error: any) {
    console.error('Error autodetecting profile:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to autodetect profile',
      message: error.message
    })
  }
})