import { tasks } from '@trigger.dev/sdk/v3'
import { prisma } from '../db'
import { wellnessRepository } from '../repositories/wellnessRepository'
import { workoutRepository } from '../repositories/workoutRepository'
import { fetchGarminActivityFile, requestGarminBackfill } from '../garmin'
import { parseFitFile, extractFitStreams, extractFitExtrasMeta } from '../fit'
import { deduplicateWorkoutsTask } from '../../../trigger/deduplicate-workouts'
import { shouldAutoDeduplicateWorkoutsAfterIngestion } from '../ingestion-settings'
import { normalizeGarminActivityType } from '../activity-mapping'
import crypto from 'crypto'

function normalizeDeviceName(name: unknown): string | null {
  if (typeof name !== 'string') return null
  const trimmed = name.trim()
  if (!trimmed) return null
  if (trimmed.toLowerCase() === 'unknown') return null
  return trimmed
}

function inferDeviceNameFromFitData(fitData: any): string | null {
  const infos = Array.isArray(fitData?.device_infos) ? fitData.device_infos : []
  for (const info of infos) {
    const candidate =
      normalizeDeviceName(info?.product_name) ||
      normalizeDeviceName(info?.productName) ||
      normalizeDeviceName(info?.name) ||
      normalizeDeviceName(info?.device_name) ||
      normalizeDeviceName(info?.deviceName)

    if (candidate) return candidate
  }
  return null
}

export const GarminService = {
  /**
   * Process a single webhook payload (Push API).
   */
  async processWebhookEvent(
    payload: any,
    context?: { query?: Record<string, any> | null; headers?: Record<string, any> | null }
  ) {
    console.log('[GarminService] Processing webhook payload:', Object.keys(payload))
    const pullToken = this.extractPullToken(payload, context)

    const deregistrations = Array.isArray(payload?.deregistrations) ? payload.deregistrations : []
    const userPermissionsChange = Array.isArray(payload?.userPermissionsChange)
      ? payload.userPermissionsChange
      : []

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
    const hasSummaryData =
      dailies.length > 0 ||
      sleeps.length > 0 ||
      hrv.length > 0 ||
      activities.length > 0 ||
      bodyComps.length > 0 ||
      pulseOx.length > 0 ||
      respiration.length > 0 ||
      stress.length > 0 ||
      userMetrics.length > 0 ||
      moveIQ.length > 0

    let deregisteredCount = 0
    let permissionUpdatedCount = 0

    if (deregistrations.length > 0) {
      deregisteredCount = await this.processDeregistrations(deregistrations)
    }
    if (userPermissionsChange.length > 0) {
      permissionUpdatedCount = await this.processUserPermissionChanges(userPermissionsChange)
    }

    if (!hasSummaryData) {
      if (deregistrations.length > 0 || userPermissionsChange.length > 0) {
        return {
          handled: true,
          message: `Processed Garmin admin events: ${deregisteredCount} deregistrations, ${permissionUpdatedCount} permission updates`
        }
      }
      return { handled: false, message: 'No recognized Garmin summary/admin event in payload' }
    }

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
      if (activities.length > 0)
        await this.processActivities(userId, activities, integration, pullToken)

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

  async processDeregistrations(records: any[]) {
    const userIds = Array.from(
      new Set(
        records
          .map((record) => (typeof record?.userId === 'string' ? record.userId.trim() : ''))
          .filter(Boolean)
      )
    )

    if (userIds.length === 0) return 0

    const result = await prisma.integration.deleteMany({
      where: {
        provider: 'garmin',
        externalUserId: { in: userIds }
      }
    })

    return result.count
  },

  async processUserPermissionChanges(records: any[]) {
    let updatedCount = 0

    for (const record of records) {
      const userId = typeof record?.userId === 'string' ? record.userId.trim() : ''
      if (!userId) continue

      const permissions = Array.isArray(record?.permissions)
        ? record.permissions.filter((permission: unknown) => typeof permission === 'string')
        : []
      const scope = permissions.length > 0 ? permissions.join(' ') : null
      const permissionsRemoved = permissions.length === 0

      const result = await prisma.integration.updateMany({
        where: {
          provider: 'garmin',
          externalUserId: userId
        },
        data: {
          scope,
          errorMessage: permissionsRemoved
            ? 'Garmin permissions were removed by the user in Garmin Connect.'
            : null
        }
      })

      updatedCount += result.count
    }

    return updatedCount
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
  async processActivities(
    userId: string,
    data: any[],
    integration: any,
    pullToken?: string | null
  ) {
    for (const record of data) {
      const startDate = new Date(record.startTimeInSeconds * 1000)
      const externalId = record.summaryId
        ? String(record.summaryId)
        : String(record.activityId || '')

      if (!externalId) {
        console.warn('[GarminService] Skipping activity without summaryId/activityId', {
          userId,
          record
        })
        continue
      }

      const workoutData: any = {
        userId,
        externalId,
        source: 'garmin',
        date: startDate,
        title: record.activityName || `Garmin ${record.activityType}`,
        type: normalizeGarminActivityType(record.activityType),
        durationSec: record.durationInSeconds,
        elapsedTimeSec: record.durationInSeconds || null,
        distanceMeters: record.distanceInMeters || null,
        elevationGain: record.totalElevationGainInMeters
          ? Math.round(record.totalElevationGainInMeters)
          : null,
        averageCadence: record.averageBikeCadenceInRoundsPerMinute
          ? Math.round(record.averageBikeCadenceInRoundsPerMinute)
          : null,
        maxCadence: record.maxBikeCadenceInRoundsPerMinute
          ? Math.round(record.maxBikeCadenceInRoundsPerMinute)
          : null,
        averageSpeed: record.averageSpeedInMetersPerSecond || null,
        averageHr: record.averageHeartRateInBeatsPerMinute || null,
        maxHr: record.maxHeartRateInBeatsPerMinute || null,
        calories: record.activeKilocalories ? Math.round(record.activeKilocalories) : null,
        kilojoules: record.activeKilocalories
          ? Math.round(record.activeKilocalories * 4.184)
          : null,
        deviceName: normalizeDeviceName(record.deviceName),
        isPrivate: null,
        commute: null,
        rawJson: record
      }

      const upserted = await workoutRepository.upsert(
        userId,
        'garmin',
        externalId,
        workoutData,
        workoutData
      )

      // Try to fetch streams (FIT file) if not already present
      if (upserted.record) {
        const existingStream = await prisma.workoutStream.findUnique({
          where: { workoutId: upserted.record.id },
          select: { id: true }
        })
        const existingFitFile = await prisma.fitFile.findUnique({
          where: { workoutId: upserted.record.id },
          select: { id: true }
        })

        if (!existingStream || !existingFitFile) {
          try {
            const buffer = await fetchGarminActivityFile(integration, externalId, pullToken)
            const hash = crypto.createHash('sha256').update(buffer).digest('hex')

            // Persist raw FIT payload so we can re-process/backfill parsing later.
            await prisma.fitFile.upsert({
              where: { workoutId: upserted.record.id },
              create: {
                userId,
                workoutId: upserted.record.id,
                filename: `garmin_${externalId}.fit`,
                fileData: buffer as any,
                hash
              },
              update: {
                filename: `garmin_${externalId}.fit`,
                fileData: buffer as any,
                hash
              }
            })

            const fitData = await parseFitFile(buffer)
            const streams = extractFitStreams(fitData.records)
            const extrasMeta = extractFitExtrasMeta(fitData)
            const fitDeviceName = inferDeviceNameFromFitData(fitData)

            if (!upserted.record.deviceName && fitDeviceName) {
              await prisma.workout.update({
                where: { id: upserted.record.id },
                data: { deviceName: fitDeviceName }
              })
            }

            if (!existingStream && streams) {
              await prisma.workoutStream.upsert({
                where: { workoutId: upserted.record.id },
                create: {
                  workoutId: upserted.record.id,
                  ...streams,
                  extrasMeta
                },
                update: { ...streams, extrasMeta }
              })
            } else if (existingStream) {
              await prisma.workoutStream.update({
                where: { workoutId: upserted.record.id },
                data: { extrasMeta }
              })
            }
          } catch (e) {
            console.error(`[GarminService] Failed to ingest streams for ${externalId}`, e)
          }
        }
      }
    }

    if (data.length > 0 && (await shouldAutoDeduplicateWorkoutsAfterIngestion(userId))) {
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

  extractPullToken(
    payload: any,
    context?: { query?: Record<string, any> | null; headers?: Record<string, any> | null }
  ): string | null {
    const queryToken = context?.query?.token
    if (typeof queryToken === 'string' && queryToken.trim()) return queryToken.trim()
    if (Array.isArray(queryToken)) {
      const candidate = queryToken.find((value) => typeof value === 'string' && value.trim())
      if (candidate) return candidate.trim()
    }

    const payloadToken = payload?.token
    if (typeof payloadToken === 'string' && payloadToken.trim()) return payloadToken.trim()

    const headerToken =
      context?.headers?.['x-garmin-pull-token'] || context?.headers?.['X-Garmin-Pull-Token']
    if (typeof headerToken === 'string' && headerToken.trim()) return headerToken.trim()
    if (Array.isArray(headerToken)) {
      const candidate = headerToken.find((value) => typeof value === 'string' && value.trim())
      if (candidate) return candidate.trim()
    }

    return null
  }
}
