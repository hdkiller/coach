import { getServerSession } from '#auth'
import { prisma } from '../../utils/db'
import { athleteMetricsService } from '../../utils/athleteMetricsService'
import { fetchIntervalsAthleteProfile } from '../../utils/intervals'

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
    
    // Detect if key metrics changed to trigger recalculation
    let metricsChanged = false
    const metricsUpdate: any = {}

    if (intervalsProfile.ftp && intervalsProfile.ftp !== user.ftp) {
      metricsUpdate.ftp = intervalsProfile.ftp
      metricsChanged = true
    }
    if (intervalsProfile.maxHR && intervalsProfile.maxHR !== user.maxHr) {
      metricsUpdate.maxHr = intervalsProfile.maxHR
      metricsChanged = true
    }
    if (intervalsProfile.weight && intervalsProfile.weight !== user.weight) {
      metricsUpdate.weight = intervalsProfile.weight
      metricsChanged = true
    }

    let updatedUser;

    // Use service if metrics changed
    if (metricsChanged) {
      updatedUser = await athleteMetricsService.updateMetrics(user.id, metricsUpdate)
    }

    // Handle other fields separately (restingHR, etc.) if they weren't part of the metrics update
    const otherUpdates: any = {}
    if (intervalsProfile.restingHR) otherUpdates.restingHr = intervalsProfile.restingHR
    
    // If we have other updates, apply them
    if (Object.keys(otherUpdates).length > 0) {
      updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: otherUpdates
      })
    }
    
    // If nothing happened
    if (!metricsChanged && Object.keys(otherUpdates).length === 0) {
      return {
        success: true,
        message: 'No new data found from Intervals.icu',
        updates: {}
      }
    }

    // Combine updates for response
    const allUpdates = { ...metricsUpdate, ...otherUpdates }

    return {
      success: true,
      message: 'Profile updated from Intervals.icu',
      updates: allUpdates,
      profile: updatedUser
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
