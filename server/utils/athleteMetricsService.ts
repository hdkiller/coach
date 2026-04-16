import { prisma } from './db'
import { userRepository } from './repositories/userRepository'
import { sportSettingsRepository } from './repositories/sportSettingsRepository'
import { calculatePowerZones, calculateHrZones, calculatePaceZones } from './zones'
import { roundToTwoDecimals } from './number'
import { metabolicService } from './services/metabolicService'
import { getUserLocalDate, getUserTimezone } from './date'
import { isNutritionTrackingEnabled } from './nutrition/feature'

export const athleteMetricsService = {
  /**
   * Update athlete metrics (FTP, Weight, Max HR) and automatically recalculate zones.
   * Updates both the global User record and the Default Sport Profile.
   */
  async updateMetrics(
    userId: string,
    metrics: {
      ftp?: number | null
      weight?: number | null
      maxHr?: number | null
      lthr?: number | null
      date?: Date
    },
    options: { sportType?: string; weightUpdateSource?: 'manual' | 'sync' } = {}
  ) {
    const { sportType, weightUpdateSource = 'manual' } = options
    const user = await userRepository.getById(userId)
    if (!user) throw new Error('User not found')

    const userUpdateData: any = {}
    const sportUpdateData: any = {}
    const effectiveMetrics = { ...metrics }
    const shouldSkipProfileWeightUpdate =
      weightUpdateSource === 'sync' && user.weightSourceMode === 'PROFILE_LOCK'

    // 1. Prepare User Update (Basic/Global fields)
    if (metrics.ftp !== undefined) userUpdateData.ftp = metrics.ftp
    if (!shouldSkipProfileWeightUpdate && metrics.weight !== undefined && metrics.weight !== null)
      userUpdateData.weight = roundToTwoDecimals(metrics.weight)
    else if (!shouldSkipProfileWeightUpdate && metrics.weight !== undefined)
      userUpdateData.weight = metrics.weight
    if (metrics.maxHr !== undefined) userUpdateData.maxHr = metrics.maxHr
    if (metrics.lthr !== undefined) userUpdateData.lthr = metrics.lthr

    if (shouldSkipProfileWeightUpdate) {
      effectiveMetrics.weight = undefined
    }

    // 2. Prepare Sport Profile Update (for Default profile)
    if (metrics.ftp !== undefined) sportUpdateData.ftp = metrics.ftp
    if (metrics.maxHr !== undefined) sportUpdateData.maxHr = metrics.maxHr
    if (metrics.lthr !== undefined) sportUpdateData.lthr = metrics.lthr

    // 3. Recalculate Zones for Default Profile
    const ftp = metrics.ftp ?? user.ftp
    const maxHr = metrics.maxHr ?? user.maxHr
    const lthr = metrics.lthr ?? user.lthr

    if (ftp) {
      sportUpdateData.powerZones = calculatePowerZones(ftp)
    }

    if (maxHr || lthr) {
      const activeLthr = lthr || (maxHr ? Math.round(maxHr * 0.9) : null)
      sportUpdateData.hrZones = calculateHrZones(activeLthr, maxHr)
    }

    // 4. Persist Updates
    const oldMetrics = await prisma.user.findUnique({
      where: { id: userId },
      select: { ftp: true, lthr: true, maxHr: true }
    })

    const updatedUser =
      Object.keys(userUpdateData).length > 0
        ? await prisma.user.update({
            where: { id: userId },
            data: userUpdateData
          })
        : user

    // NEW: Log manual updates to MetricHistory
    const logs: any[] = []
    if (metrics.ftp !== undefined && metrics.ftp !== oldMetrics?.ftp) {
      logs.push({
        userId,
        type: 'FTP',
        value: metrics.ftp || 0,
        oldValue: oldMetrics?.ftp,
        source: 'MANUAL',
        date: new Date()
      })
    }
    if (metrics.lthr !== undefined && metrics.lthr !== oldMetrics?.lthr) {
      logs.push({
        userId,
        type: 'LTHR',
        value: metrics.lthr || 0,
        oldValue: oldMetrics?.lthr,
        source: 'MANUAL',
        date: new Date()
      })
    }
    if (metrics.maxHr !== undefined && metrics.maxHr !== oldMetrics?.maxHr) {
      logs.push({
        userId,
        type: 'MAX_HR',
        value: metrics.maxHr || 0,
        oldValue: oldMetrics?.maxHr,
        source: 'MANUAL',
        date: new Date()
      })
    }
    if (logs.length > 0) {
      await prisma.metricHistory.createMany({ data: logs })
    }

    // Update Specific Sport Profile if sportType provided
    if (sportType) {
      const specificProfile = await sportSettingsRepository.getForActivityType(userId, sportType)
      if (specificProfile) {
        await prisma.sportSettings.update({
          where: { id: specificProfile.id },
          data: sportUpdateData
        })
      }
    }

    // Update Default Sport Profile
    const defaultProfile = await sportSettingsRepository.getDefault(userId)
    if (defaultProfile) {
      await prisma.sportSettings.update({
        where: { id: defaultProfile.id },
        data: sportUpdateData
      })
    }

    // 5. Weight History
    if (metrics.weight !== undefined && metrics.weight !== null) {
      const effectiveDate = metrics.date || new Date()
      const dateOnly = new Date(effectiveDate)
      dateOnly.setUTCHours(0, 0, 0, 0)
      const roundedWeight = roundToTwoDecimals(metrics.weight)

      try {
        await prisma.wellness.upsert({
          where: { userId_date: { userId, date: dateOnly } },
          create: { userId, date: dateOnly, weight: roundedWeight },
          update: { weight: roundedWeight }
        })
      } catch (e) {
        console.error(`[MetricsService] Failed to log weight history:`, e)
      }
    }

    // 6. Sync Goal Progress
    await this.syncGoalProgress(userId, effectiveMetrics)

    // NEW: Resolve threshold recommendations if metrics were updated
    if (metrics.ftp !== undefined || metrics.lthr !== undefined || metrics.maxHr !== undefined) {
      await this.resolveThresholdRecommendations(userId, metrics)
    }

    // 7. REACTIVE: Update metabolic plan synchronously
    // If weight or FTP changed, the whole fueling plan needs updating
    if (effectiveMetrics.weight !== undefined || effectiveMetrics.ftp !== undefined) {
      try {
        if (await isNutritionTrackingEnabled(userId)) {
          const timezone = await getUserTimezone(userId)
          const today = getUserLocalDate(timezone)
          await metabolicService.calculateFuelingPlanForDate(userId, today, { persist: true })
        }
      } catch (err) {
        console.error('[MetricsService] Failed to update metabolic plan:', err)
      }
    }

    return updatedUser
  },

  /**
   * Mark active threshold recommendations as completed if the user has updated their metrics.
   */
  async resolveThresholdRecommendations(
    userId: string,
    metrics: {
      ftp?: number | null
      lthr?: number | null
      maxHr?: number | null
      thresholdPace?: number | null
    }
  ) {
    const metricsToResolve = []
    if (metrics.ftp !== undefined) metricsToResolve.push('FTP')
    if (metrics.lthr !== undefined) metricsToResolve.push('LTHR')
    if (metrics.maxHr !== undefined) metricsToResolve.push('MAX_HR')
    if (metrics.thresholdPace !== undefined) metricsToResolve.push('THRESHOLD_PACE')

    if (metricsToResolve.length === 0) return

    await prisma.recommendation.updateMany({
      where: {
        userId,
        metric: { in: metricsToResolve },
        status: 'ACTIVE',
        sourceType: 'workout'
      },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    })
  },

  /**
   * Apply a completed threshold recommendation to the athlete profile.
   * Threshold recommendations are generated from workouts, but the user action
   * that marks them complete is what should promote the detected value into
   * active profile settings.
   */
  async applyThresholdRecommendation(recommendation: {
    userId: string
    sourceType: string
    metric: string
    history?: unknown
  }) {
    if (recommendation.sourceType !== 'workout') return false

    const metric = recommendation.metric
    if (!['FTP', 'LTHR', 'MAX_HR', 'THRESHOLD_PACE'].includes(metric)) return false

    const history = recommendation.history as
      | {
          newValue?: unknown
          workoutId?: unknown
          sportName?: unknown
        }
      | null
      | undefined
    const newValue = Number(history?.newValue)
    if (!Number.isFinite(newValue) || newValue <= 0) return false

    const [user, workout] = await Promise.all([
      prisma.user.findUnique({
        where: { id: recommendation.userId },
        select: { id: true, ftp: true, lthr: true, maxHr: true }
      }),
      typeof history?.workoutId === 'string'
        ? prisma.workout.findUnique({
            where: { id: history.workoutId },
            select: { type: true }
          })
        : null
    ])

    if (!user) throw new Error('User not found')

    const userUpdateData: any = {}
    const sportUpdateData: any = {}

    if (metric === 'FTP') {
      userUpdateData.ftp = Math.round(newValue)
      sportUpdateData.ftp = Math.round(newValue)
      sportUpdateData.powerZones = calculatePowerZones(Math.round(newValue))
    } else if (metric === 'LTHR') {
      userUpdateData.lthr = Math.round(newValue)
      sportUpdateData.lthr = Math.round(newValue)
      sportUpdateData.hrZones = calculateHrZones(Math.round(newValue), user.maxHr)
    } else if (metric === 'MAX_HR') {
      userUpdateData.maxHr = Math.round(newValue)
      sportUpdateData.maxHr = Math.round(newValue)
      sportUpdateData.hrZones = calculateHrZones(user.lthr, Math.round(newValue))
    } else if (metric === 'THRESHOLD_PACE') {
      sportUpdateData.thresholdPace = newValue
      sportUpdateData.paceZones = calculatePaceZones(newValue)
    }

    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: recommendation.userId },
        data: userUpdateData
      })
    }

    const profilesToUpdate = new Map<string, any>()
    const defaultProfile = await sportSettingsRepository.getDefault(recommendation.userId)
    if (defaultProfile) profilesToUpdate.set(defaultProfile.id, defaultProfile)

    if (workout?.type) {
      const sportProfile = await sportSettingsRepository.getForActivityType(
        recommendation.userId,
        workout.type
      )
      if (sportProfile) profilesToUpdate.set(sportProfile.id, sportProfile)
    }

    if (typeof history?.sportName === 'string' && history.sportName.trim()) {
      const sportProfiles = await prisma.sportSettings.findMany({
        where: {
          userId: recommendation.userId,
          name: history.sportName.trim()
        }
      })
      for (const profile of sportProfiles) profilesToUpdate.set(profile.id, profile)
    }

    for (const profile of profilesToUpdate.values()) {
      await prisma.sportSettings.update({
        where: { id: profile.id },
        data: sportUpdateData
      })
    }

    if (metric === 'FTP') {
      await this.syncGoalProgress(recommendation.userId, { ftp: Math.round(newValue) })
    }

    return true
  },

  /**
   * Sync progress for active goals based on updated metrics.
   */
  async syncGoalProgress(
    userId: string,
    metrics: {
      ftp?: number | null
      weight?: number | null
    }
  ) {
    const activeGoals = await prisma.goal.findMany({
      where: {
        userId,
        status: 'ACTIVE'
      }
    })

    for (const goal of activeGoals) {
      const updateData: any = {}

      // Update Weight Goals
      if (
        (goal.metric === 'weight_kg' || goal.type === 'BODY_COMPOSITION') &&
        metrics.weight !== undefined &&
        metrics.weight !== null
      ) {
        updateData.currentValue = roundToTwoDecimals(metrics.weight)
      }

      // Update FTP Goals
      if (
        (goal.metric === 'FTP (Watts)' || goal.title?.toLowerCase().includes('ftp')) &&
        metrics.ftp !== undefined &&
        metrics.ftp !== null
      ) {
        updateData.currentValue = metrics.ftp
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.goal.update({
          where: { id: goal.id },
          data: updateData
        })
      }
    }
  },

  /**
   * Get the current effective zones for an athlete from the Default profile.
   */
  async getCurrentZones(userId: string) {
    const defaultProfile = await sportSettingsRepository.getDefault(userId)
    if (!defaultProfile) {
      // Fallback to legacy User zones if default profile somehow missing
      const user = await userRepository.getById(userId)
      return {
        power: user?.powerZones || [],
        hr: user?.hrZones || []
      }
    }

    return {
      power: defaultProfile.powerZones || [],
      hr: defaultProfile.hrZones || []
    }
  }
}
