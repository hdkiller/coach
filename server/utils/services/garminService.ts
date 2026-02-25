import { tasks } from '@trigger.dev/sdk/v3'
import { prisma } from '../db'
import { wellnessRepository } from '../repositories/wellnessRepository'
import { workoutRepository } from '../repositories/workoutRepository'
import { fetchGarminActivityFile, requestGarminBackfill } from '../garmin'
import { parseFitFile, extractFitStreams } from '../fit'
import { deduplicateWorkoutsTask } from '../../../trigger/deduplicate-workouts'

export const GarminService = {
  /**
   * Process a single webhook payload (Push API).
   */
  async processWebhookEvent(payload: any) {
    console.log('[GarminService] Processing webhook payload:', Object.keys(payload))

    // Garmin Push API sends lists of records. Identify what we received.
    const dailies = payload.dailies || []
    const sleeps = payload.sleeps || []
    const hrv = payload.hrv || []
    const activities = payload.activities || payload.manuallyUpdatedActivities || []
    const bodyComps = payload.bodyComposition || []
    const pulseOx = payload.pulseOx || []
    const respiration = payload.respiration || []
    const stress = payload.stress || []
    const userMetrics = payload.userMetrics || []
    const moveIQ = payload.moveIQActivities || []

    // Resolve User ID from the first record that has one
    const externalUserId =
      dailies[0]?.userId ||
      sleeps[0]?.userId ||
      hrv[0]?.userId ||
      activities[0]?.userId ||
      bodyComps[0]?.userId ||
      pulseOx[0]?.userId ||
      respiration[0]?.userId ||
      stress[0]?.userId ||
      userMetrics[0]?.userId

    if (!externalUserId) {
      return { handled: false, message: 'No userId found in payload' }
    }

    const integration = await prisma.integration.findFirst({
      where: { externalUserId, provider: 'garmin' }
    })

    if (!integration) {
      return { handled: false, message: `No integration found for Garmin ID: ${externalUserId}` }
    }

    const userId = integration.userId

    // Process all metrics immediately in the worker
    try {
      if (dailies.length > 0) await this.processWellness(userId, dailies)
      if (sleeps.length > 0) await this.processSleep(userId, sleeps)
      if (hrv.length > 0) await this.processHRV(userId, hrv)
      if (activities.length > 0) await this.processActivities(userId, activities, integration)

      // Handle additional health types
      if (bodyComps.length > 0) await this.processBodyComp(userId, bodyComps)
      if (userMetrics.length > 0) await this.processUserMetrics(userId, userMetrics)

      return {
        handled: true,
        message: `Processed: ${activities.length} activities, ${dailies.length} dailies, ${sleeps.length} sleeps, ${hrv.length} hrv`
      }
    } catch (error: any) {
      console.error('[GarminService] Error processing webhook:', error)
      throw error
    }
  },

  /**
   * Start historical backfill for a user
   */
  async startBackfill(userId: string) {
    const integration = await prisma.integration.findUnique({
      where: { userId_provider: { userId, provider: 'garmin' } }
    })

    if (!integration) return

    const now = Math.floor(Date.now() / 1000) - 60
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60

    // Request backfill for all major types sequentially to respect rate limits
    const types: Array<'activities' | 'dailies' | 'sleeps' | 'hrv'> = [
      'activities',
      'dailies',
      'sleeps',
      'hrv'
    ]

    for (const type of types) {
      try {
        await requestGarminBackfill(integration, type, thirtyDaysAgo, now)
        console.log(`[GarminService] Backfill requested for ${type}`)
      } catch (error) {
        console.error(`[GarminService] Backfill failed for ${type}:`, error)
      }
    }
  },

  /**
   * Process Garmin Wellness data
   */
  async processWellness(userId: string, data: any[]) {
    for (const record of data) {
      const date = new Date(record.startTimeInSeconds * 1000)
      const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))

      const wellnessData: any = {
        userId,
        date: utcDate,
        restingHr: record.restingHeartRateInBeatsPerMinute || null,
        stress: record.averageStressLevel || null,
        spO2: record.averagePulseOx || null,
        respiration: record.averageRespiration || null,
        rawJson: record
      }

      await wellnessRepository.upsert(userId, utcDate, wellnessData, wellnessData, 'garmin')
    }
  },

  /**
   * Process Garmin Sleep data
   */
  async processSleep(userId: string, data: any[]) {
    for (const record of data) {
      const date = new Date(record.startTimeInSeconds * 1000)
      const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))

      const sleepData: any = {
        userId,
        date: utcDate,
        sleepSecs: record.durationInSeconds || null,
        sleepScore: record.overallSleepScore?.value || null,
        sleepDeepSecs: record.deepSleepDurationInSeconds || null,
        sleepRemSecs: record.remSleepInSeconds || null,
        sleepLightSecs: record.lightSleepDurationInSeconds || null,
        rawJson: record
      }

      await wellnessRepository.upsert(userId, utcDate, sleepData, sleepData, 'garmin')
    }
  },

  /**
   * Process Garmin HRV data
   */
  async processHRV(userId: string, data: any[]) {
    for (const record of data) {
      const date = new Date(record.startTimeInSeconds * 1000)
      const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))

      const hrvData: any = {
        userId,
        date: utcDate,
        hrv: record.lastNightAvg || null,
        rawJson: record
      }

      await wellnessRepository.upsert(userId, utcDate, hrvData, hrvData, 'garmin')
    }
  },

  /**
   * Process Garmin Body Composition (Weight)
   */
  async processBodyComp(userId: string, data: any[]) {
    for (const record of data) {
      const date = new Date(record.measurementTimeInSeconds * 1000)
      const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))

      const weightData: any = {
        userId,
        date: utcDate,
        weight: record.weightInGrams ? record.weightInGrams / 1000 : null,
        bodyFat: record.bodyFatInPercent || null,
        rawJson: record
      }

      await wellnessRepository.upsert(userId, utcDate, weightData, weightData, 'garmin')
    }
  },

  /**
   * Process Garmin User Metrics (VO2 Max, etc.)
   */
  async processUserMetrics(userId: string, data: any[]) {
    for (const record of data) {
      const date = new Date(record.calendarDate)
      const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))

      const metricsData: any = {
        userId,
        date: utcDate,
        vo2Max: record.vo2Max || record.vo2MaxCycling || null,
        rawJson: record
      }

      await wellnessRepository.upsert(userId, utcDate, metricsData, metricsData, 'garmin')
    }
  },

  /**
   * Process Garmin Activities
   */
  async processActivities(userId: string, data: any[], integration: any) {
    for (const record of data) {
      const startDate = new Date(record.startTimeInSeconds * 1000)

      const workoutData: any = {
        userId,
        externalId: record.summaryId,
        source: 'garmin',
        date: startDate,
        title: record.activityName || `Garmin ${record.activityType}`,
        type: this.mapActivityType(record.activityType),
        durationSec: record.durationInSeconds,
        distanceMeters: record.distanceInMeters || null,
        averageHr: record.averageHeartRateInBeatsPerMinute || null,
        maxHr: record.maxHeartRateInBeatsPerMinute || null,
        kilojoules: record.activeKilocalories
          ? Math.round(record.activeKilocalories * 4.184)
          : null,
        rawJson: record
      }

      const upserted = await workoutRepository.upsert(
        userId,
        'garmin',
        record.summaryId,
        workoutData,
        workoutData
      )

      // Try to fetch streams (FIT file) if not already present
      if (upserted.record) {
        const existingStream = await prisma.workoutStream.findUnique({
          where: { workoutId: upserted.record.id },
          select: { id: true }
        })

        if (!existingStream) {
          try {
            const buffer = await fetchGarminActivityFile(integration, record.summaryId)
            const fitData = await parseFitFile(buffer)
            const streams = extractFitStreams(fitData.records)

            if (streams) {
              await prisma.workoutStream.upsert({
                where: { workoutId: upserted.record.id },
                create: {
                  workoutId: upserted.record.id,
                  ...streams
                },
                update: streams
              })
            }
          } catch (e) {
            console.error(`[GarminService] Failed to ingest streams for ${record.summaryId}`, e)
          }
        }
      }
    }

    if (data.length > 0) {
      await deduplicateWorkoutsTask.trigger(
        { userId, dryRun: false },
        {
          concurrencyKey: userId,
          tags: [`user:${userId}`],
          idempotencyKey: `deduplicate-workouts:auto:${userId}`,
          idempotencyKeyTTL: '2m'
        }
      )
    }
  },

  /**
   * Map Garmin activity types to Coach Watts types
   */
  mapActivityType(garminType: string): string {
    const map: Record<string, string> = {
      RUNNING: 'Run',
      CYCLING: 'Ride',
      WALKING: 'Walk',
      LAP_SWIMMING: 'Swim',
      OPEN_WATER_SWIMMING: 'Swim',
      HIKING: 'Hike',
      YOGA: 'Yoga'
    }
    return map[garminType] || 'Other'
  }
}
