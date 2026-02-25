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
    // Garmin Push API sends lists of records (activities, sleeps, etc.)
    // Each record contains a 'userId' (which is our externalUserId)
    const externalUserId =
      payload.dailies?.[0]?.userId ||
      payload.sleeps?.[0]?.userId ||
      payload.hrv?.[0]?.userId ||
      payload.activities?.[0]?.userId ||
      payload.manuallyUpdatedActivities?.[0]?.userId ||
      payload.stress?.[0]?.userId ||
      payload.userMetrics?.[0]?.userId ||
      payload.pulseOx?.[0]?.userId ||
      payload.respiration?.[0]?.userId ||
      payload.bodyComposition?.[0]?.userId

    if (!externalUserId) {
      return { handled: false, message: 'Missing externalUserId in payload' }
    }

    const integration = await prisma.integration.findFirst({
      where: { externalUserId, provider: 'garmin' }
    })

    if (!integration) {
      return { handled: false, message: `No integration found for Garmin ID: ${externalUserId}` }
    }

    // Trigger the background ingestion task for the last 24 hours to ensure consistency
    const now = Math.floor(Date.now() / 1000)
    const yesterday = now - 86400

    await tasks.trigger(
      'ingest-garmin',
      {
        userId: integration.userId,
        startTimestamp: yesterday,
        endTimestamp: now
      },
      {
        concurrencyKey: integration.userId,
        tags: [`user:${integration.userId}`, 'source:garmin'],
        idempotencyKey: `garmin-webhook:${externalUserId}:${now - (now % 60)}` // Once per minute max per user
      }
    )

    return { handled: true, message: `Triggered ingestion for user ${integration.userId}` }
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

    // Request backfill for all major types
    const results = await Promise.allSettled([
      requestGarminBackfill(integration, 'activities', thirtyDaysAgo, now),
      requestGarminBackfill(integration, 'dailies', thirtyDaysAgo, now),
      requestGarminBackfill(integration, 'sleeps', thirtyDaysAgo, now),
      requestGarminBackfill(integration, 'hrv', thirtyDaysAgo, now)
    ])

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const types = ['activities', 'dailies', 'sleeps', 'hrv']
        console.error(`[GarminService] Backfill failed for ${types[index]}:`, result.reason)
      }
    })
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
