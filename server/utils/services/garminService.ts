import { tasks } from '@trigger.dev/sdk/v3'
import { prisma } from '../db'
import { wellnessRepository } from '../repositories/wellnessRepository'
import { workoutRepository } from '../repositories/workoutRepository'
import {
  fetchGarminActivityFile,
  fetchGarminActivityFileByCallbackUrl,
  requestGarminBackfill
} from '../garmin'
import { parseFitFile, extractFitStreams, extractFitExtrasMeta } from '../fit'
import { deduplicateWorkoutsTask } from '../../../trigger/deduplicate-workouts'
import { shouldAutoDeduplicateWorkoutsAfterIngestion } from '../ingestion-settings'
import { shouldIngestActivities, shouldIngestWellness } from '../integration-settings'
import { normalizeGarminActivityType } from '../activity-mapping'
import { bodyMeasurementService } from './bodyMeasurementService'
import { normalizeReadinessScore, normalizeStressScoreForStorage } from '../wellness'
import { parseCalendarDate } from '../date'
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

function normalizeUtcDateFromTimestamp(
  timestampSeconds: number,
  offsetSeconds?: number | null
): Date | null {
  if (!Number.isFinite(timestampSeconds)) return null

  const effectiveMs =
    typeof offsetSeconds === 'number' && Number.isFinite(offsetSeconds)
      ? (timestampSeconds + offsetSeconds) * 1000
      : timestampSeconds * 1000

  const date = new Date(effectiveMs)
  if (Number.isNaN(date.getTime())) return null

  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function toFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function clampPercentage(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function extractGarminNumericMetric(
  record: Record<string, unknown>,
  keys: string[]
): number | null {
  for (const key of keys) {
    const candidate = record[key]
    const direct = toFiniteNumber(candidate)
    if (direct !== null) return direct

    if (candidate && typeof candidate === 'object') {
      const nestedValue = toFiniteNumber((candidate as Record<string, unknown>).value)
      if (nestedValue !== null) return nestedValue
    }
  }

  return null
}

export function extractGarminSpO2Percentage(record: Record<string, unknown> | null | undefined) {
  if (!record || typeof record !== 'object') return null

  const directSpO2 = extractGarminNumericMetric(record, [
    'averagePulseOx',
    'averageSpo2',
    'avgPulseOx',
    'avgSpo2',
    'pulseOx',
    'spo2'
  ])

  if (directSpO2 !== null) {
    return Math.round(directSpO2 * 10) / 10
  }

  const sleepSamples = record.timeOffsetSleepSpo2
  if (!sleepSamples || typeof sleepSamples !== 'object' || Array.isArray(sleepSamples)) {
    return null
  }

  const values = Object.values(sleepSamples)
    .map((value) => toFiniteNumber(value))
    .filter((value): value is number => value !== null)

  if (values.length === 0) return null

  const average = values.reduce((sum, value) => sum + value, 0) / values.length
  return Math.round(average * 10) / 10
}

export function extractGarminReadinessScore(record: Record<string, unknown> | null | undefined) {
  if (!record || typeof record !== 'object') return null

  const readiness = extractGarminNumericMetric(record, [
    'trainingReadinessScore',
    'trainingReadiness',
    'readinessScore',
    'readiness',
    'training_ready_score'
  ])

  if (readiness === null) return null

  return normalizeReadinessScore(clampPercentage(readiness))
}

export function extractGarminBodyBatteryScore(record: Record<string, unknown> | null | undefined) {
  if (!record || typeof record !== 'object') return null

  const bodyBattery = extractGarminNumericMetric(record, [
    'bodyBatteryMostRecentValue',
    'bodyBatteryCurrentValue',
    'bodyBatteryEndingValue',
    'bodyBatteryValue',
    'bodyBattery',
    'bodyBatteryHighestValue',
    'bodyBatteryMaxValue'
  ])

  if (bodyBattery !== null) {
    return clampPercentage(bodyBattery)
  }

  // Some Garmin devices surface readiness-style recovery metrics without a body battery field.
  // Use that score as the best available recovery proxy so REC does not stay empty.
  const readinessFallback = extractGarminNumericMetric(record, [
    'trainingReadinessScore',
    'trainingReadiness',
    'recoveryScore',
    'readinessScore',
    'readiness'
  ])

  return readinessFallback !== null ? clampPercentage(readinessFallback) : null
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
    const activityFiles = Array.isArray(payload?.activityFiles) ? payload.activityFiles : []
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
      activityFiles.length > 0 ||
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
      activityFiles[0]?.userId ||
      bodyComps[0]?.userId ||
      pulseOx[0]?.userId ||
      respiration[0]?.userId ||
      stress[0]?.userId ||
      userMetrics[0]?.userId

    if (!externalUserId) {
      return { handled: false, message: 'No userId found in payload' }
    }

    const integrations = await prisma.integration.findMany({
      where: { externalUserId, provider: 'garmin' }
    })

    if (integrations.length === 0) {
      return { handled: false, message: `No integration found for Garmin ID: ${externalUserId}` }
    }

    if (integrations.length > 1) {
      const mappedUserIds = integrations.map((integration) => integration.userId)
      console.error('[GarminService] Duplicate Garmin external user mapping detected', {
        externalUserId,
        mappedUserIds
      })
      throw new Error(
        `Duplicate Garmin externalUserId mapping for ${externalUserId}: ${mappedUserIds.join(', ')}`
      )
    }

    const integration = integrations[0]

    const userId = integration.userId
    const settings = (integration.settings as Record<string, any> | null) || {}
    const wellnessEnabled = shouldIngestWellness(settings)
    const activitiesEnabled = shouldIngestActivities('garmin', integration.ingestWorkouts, settings)

    // Process all metrics immediately in the worker
    try {
      if (wellnessEnabled && dailies.length > 0) await this.processWellness(userId, dailies)
      if (wellnessEnabled && sleeps.length > 0) await this.processSleep(userId, sleeps)
      if (wellnessEnabled && hrv.length > 0) await this.processHRV(userId, hrv)
      if (activitiesEnabled && activities.length > 0)
        await this.processActivities(userId, activities, integration, pullToken)
      if (activitiesEnabled && activityFiles.length > 0) {
        await this.processActivityFiles(userId, activityFiles, integration)
      }

      // Handle additional health types
      if (wellnessEnabled && bodyComps.length > 0) await this.processBodyComp(userId, bodyComps)
      if (wellnessEnabled && userMetrics.length > 0) {
        await this.processUserMetrics(userId, userMetrics)
      }

      return {
        handled: true,
        message: `Processed: ${activities.length} activities, ${activityFiles.length} activity files, ${dailies.length} dailies, ${sleeps.length} sleeps, ${hrv.length} hrv`
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
      const utcDate = this.resolveWellnessDate(record, {
        timestampField: 'startTimeInSeconds',
        offsetField: 'startTimeOffsetInSeconds'
      })
      if (!utcDate) continue

      const wellnessData: any = {
        userId,
        date: utcDate,
        restingHr: record.restingHeartRateInBeatsPerMinute || null,
        recoveryScore: extractGarminBodyBatteryScore(record),
        readiness: extractGarminReadinessScore(record),
        stress: normalizeStressScoreForStorage(record.averageStressLevel),
        spO2: extractGarminSpO2Percentage(record),
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
      const utcDate = this.resolveWellnessDate(record, {
        timestampField: 'startTimeInSeconds',
        offsetField: 'startTimeOffsetInSeconds'
      })
      if (!utcDate) continue

      const sleepData: any = {
        userId,
        date: utcDate,
        sleepSecs: record.durationInSeconds || null,
        sleepScore: record.overallSleepScore?.value || null,
        spO2: extractGarminSpO2Percentage(record),
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
      const utcDate = this.resolveWellnessDate(record, {
        timestampField: 'startTimeInSeconds',
        offsetField: 'startTimeOffsetInSeconds'
      })
      if (!utcDate) continue

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
      const utcDate = this.resolveWellnessDate(record, {
        timestampField: 'measurementTimeInSeconds',
        offsetField: 'measurementTimeOffsetInSeconds'
      })
      if (!utcDate) continue

      const weightData: any = {
        userId,
        date: utcDate,
        weight: record.weightInGrams ? record.weightInGrams / 1000 : null,
        bodyFat: record.bodyFatInPercent || null,
        rawJson: record
      }

      const { record: savedRecord } = await wellnessRepository.upsert(
        userId,
        utcDate,
        weightData,
        weightData,
        'garmin'
      )
      await bodyMeasurementService.recordWellnessMetrics(
        userId,
        {
          id: savedRecord.id,
          date: savedRecord.date,
          weight: savedRecord.weight,
          bodyFat: savedRecord.bodyFat,
          rawJson: savedRecord.rawJson
        },
        'garmin'
      )
    }
  },

  /**
   * Process Garmin User Metrics (VO2 Max, etc.)
   */
  async processUserMetrics(userId: string, data: any[]) {
    for (const record of data) {
      const utcDate = this.resolveWellnessDate(record, {
        dateFields: ['calendarDate'],
        timestampField: 'measurementTimeInSeconds',
        offsetField: 'measurementTimeOffsetInSeconds'
      })
      if (!utcDate) continue

      const metricsData: any = {
        userId,
        date: utcDate,
        vo2max: record.vo2Max || record.vo2MaxCycling || null,
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
            await this.ingestFitArtifactsForWorkout(userId, upserted.record.id, externalId, buffer)
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

  async processActivityFiles(userId: string, data: any[], integration: any) {
    for (const record of data) {
      const callbackUrl =
        typeof record?.callbackURL === 'string' && record.callbackURL.trim()
          ? record.callbackURL.trim()
          : null

      if (!callbackUrl) continue

      const candidateExternalIds = this.getActivityFileExternalIds(record)
      if (candidateExternalIds.length === 0) continue

      const workout = await prisma.workout.findFirst({
        where: {
          userId,
          source: 'garmin',
          externalId: { in: candidateExternalIds }
        },
        orderBy: { date: 'desc' }
      })

      if (!workout) {
        console.warn('[GarminService] No matching Garmin workout found for activity file', {
          userId,
          candidateExternalIds
        })
        continue
      }

      const existingFitFile = await prisma.fitFile.findUnique({
        where: { workoutId: workout.id },
        select: { id: true }
      })
      const existingStream = await prisma.workoutStream.findUnique({
        where: { workoutId: workout.id },
        select: { id: true }
      })

      if (existingFitFile && existingStream) continue

      try {
        const buffer = await fetchGarminActivityFileByCallbackUrl(integration, callbackUrl)
        await this.ingestFitArtifactsForWorkout(userId, workout.id, workout.externalId, buffer)
      } catch (e) {
        console.error(
          `[GarminService] Failed to ingest activity file for workout ${workout.id} (${workout.externalId})`,
          e
        )
      }
    }
  },

  getActivityFileExternalIds(record: any): string[] {
    const ids = new Set<string>()

    if (record?.activityId !== undefined && record?.activityId !== null) {
      ids.add(String(record.activityId))
    }

    if (typeof record?.summaryId === 'string' && record.summaryId.trim()) {
      const summaryId = record.summaryId.trim()
      ids.add(summaryId)
      if (summaryId.endsWith('-file')) ids.add(summaryId.slice(0, -5))
    }

    return [...ids]
  },

  resolveWellnessDate(
    record: Record<string, any>,
    options: {
      dateFields?: string[]
      timestampField?: string
      offsetField?: string
    } = {}
  ): Date | null {
    const dateFields = options.dateFields ?? ['calendarDate', 'date']

    for (const field of dateFields) {
      const value = record?.[field]
      if (typeof value === 'string' && value.trim()) {
        const parsed = parseCalendarDate(value.trim())
        if (parsed) return parsed
      }
    }

    const timestampValue = options.timestampField ? record?.[options.timestampField] : undefined
    if (typeof timestampValue === 'number' && Number.isFinite(timestampValue)) {
      const offsetValue = options.offsetField ? record?.[options.offsetField] : undefined
      return normalizeUtcDateFromTimestamp(
        timestampValue,
        typeof offsetValue === 'number' ? offsetValue : null
      )
    }

    return null
  },

  async ingestFitArtifactsForWorkout(
    userId: string,
    workoutId: string,
    externalId: string,
    buffer: Buffer
  ) {
    const hash = crypto.createHash('sha256').update(buffer).digest('hex')

    await prisma.fitFile.upsert({
      where: { workoutId },
      create: {
        userId,
        workoutId,
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

    if (fitDeviceName) {
      await prisma.workout.update({
        where: { id: workoutId },
        data: { deviceName: fitDeviceName }
      })
    }

    await prisma.workoutStream.upsert({
      where: { workoutId },
      create: {
        workoutId,
        ...streams,
        extrasMeta
      },
      update: { ...streams, extrasMeta }
    })
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
