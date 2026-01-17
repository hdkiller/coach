import { getServerSession } from '../../utils/session'
import { IntervalsService } from '../../utils/services/intervalsService'
import { sportSettingsRepository } from '../../utils/repositories/sportSettingsRepository'

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
      where: { email: session.user.email },
      include: {
        integrations: true
      }
    })

    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    // Get Sport Settings via Repository (ensures Default exists)
    const sportSettings = await sportSettingsRepository.getByUserId(user.id)
    // Attach to user object for downstream logic compatibility
    ;(user as any).sportSettings = sportSettings

    const intervalsIntegration = user.integrations.find((i) => i.provider === 'intervals')

    if (!intervalsIntegration) {
      return {
        success: false,
        message: 'Intervals.icu integration not connected'
      }
    }

    // Fetch profile from Intervals (normalized)
    const intervalsProfile = await IntervalsService.getAthleteProfile(intervalsIntegration)

    // Compare and detect changes
    const diff: any = {}
    const detected: any = {} // Store the full detected values for preview

    // 1. Basic Fields
    if (intervalsProfile.weight && Math.abs((user.weight || 0) - intervalsProfile.weight) > 0.1) {
      diff.weight = intervalsProfile.weight
      detected.weight = intervalsProfile.weight
    }

    if (intervalsProfile.restingHR && user.restingHr !== intervalsProfile.restingHR) {
      diff.restingHr = intervalsProfile.restingHR
      detected.restingHr = intervalsProfile.restingHR
    }

    if (intervalsProfile.maxHR && user.maxHr !== intervalsProfile.maxHR) {
      diff.maxHr = intervalsProfile.maxHR
      detected.maxHr = intervalsProfile.maxHR
    }

    if (intervalsProfile.lthr && user.lthr !== intervalsProfile.lthr) {
      diff.lthr = intervalsProfile.lthr
      detected.lthr = intervalsProfile.lthr
    }

    if (intervalsProfile.ftp && user.ftp !== intervalsProfile.ftp) {
      diff.ftp = intervalsProfile.ftp
      detected.ftp = intervalsProfile.ftp
    }

    // 2. Sport Specific Settings
    if (intervalsProfile.sportSettings && intervalsProfile.sportSettings.length > 0) {
      const sportDiffs: any[] = []
      const existingSettings = sportSettings

      for (const newSetting of intervalsProfile.sportSettings) {
        // Find matching existing setting by externalId (from Intervals)
        // OR by matching types if no externalId yet (first sync logic?)
        // IntervalsService.getAthlete normalizes this.

        const existing = existingSettings.find(
          (s) => s.externalId === newSetting.externalId && s.source === 'intervals'
        )

        if (!existing) {
          // New sport setting detected
          sportDiffs.push({ ...newSetting, source: 'intervals' })
        } else {
          // Check for updates in key fields
          let hasChanges = false
          if (newSetting.ftp && newSetting.ftp !== existing.ftp) hasChanges = true
          if (newSetting.lthr && newSetting.lthr !== existing.lthr) hasChanges = true
          if (newSetting.maxHr && newSetting.maxHr !== existing.maxHr) hasChanges = true

          // Check zones if needed (deep comparison or length check)
          if (areZonesDifferent(existing.powerZones, newSetting.powerZones)) hasChanges = true
          if (areZonesDifferent(existing.hrZones, newSetting.hrZones)) hasChanges = true

          if (hasChanges) {
            sportDiffs.push({ ...newSetting, id: existing.id, source: 'intervals' }) // Include ID to update
          }
        }
      }

      if (sportDiffs.length > 0) {
        diff.sportSettings = sportDiffs
        detected.sportSettings = sportDiffs
      }
    }

    return {
      success: true,
      diff,
      detected
    }
  } catch (error: any) {
    console.error('Error autodetecting profile:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to autodetect profile'
    })
  }
})

function areZonesDifferent(current: any, incoming: any) {
  if (!current && !incoming) return false
  if (!current || !incoming) return true

  const c = Array.isArray(current) ? current : []
  const i = Array.isArray(incoming) ? incoming : []

  if (c.length !== i.length) return true

  // Simple check of first/last zone max/min
  if (c.length > 0) {
    if (c[0].min !== i[0].min || c[c.length - 1].max !== i[i.length - 1].max) return true
  }

  return JSON.stringify(c) !== JSON.stringify(i)
}
