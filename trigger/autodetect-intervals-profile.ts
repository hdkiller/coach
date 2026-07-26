import './init'
import { logger, task } from '@trigger.dev/sdk/v3'
import { prisma } from '../server/utils/db'
import { IntervalsService } from '../server/utils/services/intervalsService'
import { userIngestionQueue } from './queues'
import { registerTaskHandler } from '../server/utils/task-registry'

type AutodetectIntervalsProfilePayload = { userId: string; forceUpdate?: boolean }

export async function runAutodetectIntervalsProfile(payload: AutodetectIntervalsProfilePayload) {
  const { userId, forceUpdate = false } = payload

  logger.log('Starting Intervals.icu profile auto-detection', { userId, forceUpdate })

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')

  const hrZones = (user.hrZones as any[]) || []
  const isIncomplete =
    !user.ftp || user.ftp === 0 || !user.maxHr || user.maxHr === 0 || hrZones.length === 0

  if (!isIncomplete && !forceUpdate) {
    logger.log('Profile is already configured and forceUpdate is false. Skipping auto-detection.')
    return { success: true, message: 'Profile already configured' }
  }

  try {
    const profile = await IntervalsService.syncProfile(userId)
    logger.log('Profile updated automatically from Intervals.icu', {
      userId,
      ftp: profile.ftp,
      sportSettingsCount: profile.sportSettings?.length || 0
    })
    return {
      success: true,
      message: 'Profile updated successfully',
      updatedFields: ['ftp', 'lthr', 'maxHr', 'weight', 'sportSettings']
    }
  } catch (error) {
    logger.error('Error auto-detecting profile from Intervals.icu', { error })
    throw error
  }
}

registerTaskHandler('autodetect-intervals-profile', runAutodetectIntervalsProfile)

export const autodetectIntervalsProfileTask = task({
  id: 'autodetect-intervals-profile',
  maxDuration: 300, // 5 minutes
  queue: userIngestionQueue,
  run: runAutodetectIntervalsProfile
})
