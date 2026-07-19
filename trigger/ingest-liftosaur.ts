import './init'
import { createHash } from 'node:crypto'
import { logger, task } from '@trigger.dev/sdk/v3'
import { prisma } from '../server/utils/db'
import { shouldIngestActivities } from '../server/utils/integration-settings'
import {
  fetchAllLiftosaurHistory,
  fetchLiftosaurMeasurementPage,
  LiftosaurApiError,
  parseLiftosaurMeasurementValue,
  type LiftosaurMeasurementValue
} from '../server/utils/liftosaur'
import { parseLiftosaurWorkout } from '../server/utils/liftosaur-workout-parser'
import { IntegrationAuthError, IntegrationProviderError } from '../server/utils/integration-errors'
import { wellnessRepository } from '../server/utils/repositories/wellnessRepository'
import { bodyMeasurementService } from '../server/utils/services/bodyMeasurementService'
import { athleteMetricsService } from '../server/utils/athleteMetricsService'
import { roundToTwoDecimals } from '../server/utils/number'
import { userIngestionQueue } from './queues'
import type { IngestionResult } from './types'

type LiftosaurMeasurementDay = {
  date: Date
  weight?: number
  bodyFat?: number
  raw: Record<string, LiftosaurMeasurementValue>
}

function exerciseExternalId(name: string, equipment: string | null) {
  const identity = `${name.trim().toLowerCase()}|${equipment?.trim().toLowerCase() || ''}`
  return `liftosaur:${createHash('sha256').update(identity).digest('hex').slice(0, 24)}`
}

function dateOnly(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
}

function inDateWindow(value: Date, startDate: Date, endDate: Date) {
  return value >= startDate && value <= endDate
}

async function fetchMeasurementWindow(
  apiKey: string,
  key: 'weight' | 'bodyfat',
  startDate: Date,
  endDate: Date
) {
  const values: LiftosaurMeasurementValue[] = []
  let cursor: number | string | undefined
  let reachedStart = false
  const seenCursors = new Set<string>()

  do {
    const response = await fetchLiftosaurMeasurementPage(apiKey, key, { cursor, limit: 200 })
    for (const value of response.data.values || []) {
      const timestamp = new Date(value.date)
      if (Number.isNaN(timestamp.getTime())) continue
      if (timestamp < startDate) reachedStart = true
      if (inDateWindow(timestamp, startDate, endDate)) values.push(value)
    }
    cursor = !reachedStart && response.data.hasMore ? response.data.nextCursor : undefined
    if (cursor !== undefined) {
      const cursorKey = String(cursor)
      if (seenCursors.has(cursorKey)) {
        throw new Error('Liftosaur returned a repeated measurement pagination cursor.')
      }
      seenCursors.add(cursorKey)
    }
  } while (cursor !== undefined)

  return values
}

function providerError(error: unknown, integrationId: string) {
  if (!(error instanceof LiftosaurApiError)) return error

  if (error.statusCode === 401 || error.statusCode === 403) {
    return new IntegrationAuthError({
      provider: 'liftosaur',
      integrationId,
      statusCode: error.statusCode,
      message: error.message
    })
  }

  if (error.retryable) {
    return new IntegrationProviderError({
      provider: 'liftosaur',
      integrationId,
      statusCode: error.statusCode,
      message: error.message
    })
  }

  return error
}

export const ingestLiftosaurTask = task({
  id: 'ingest-liftosaur',
  queue: userIngestionQueue,
  maxDuration: 900,
  run: async (payload: {
    userId: string
    startDate: string
    endDate: string
  }): Promise<IngestionResult> => {
    const { userId, startDate, endDate } = payload
    const rangeStart = new Date(startDate)
    const rangeEnd = new Date(endDate)

    const integration = await prisma.integration.findUnique({
      where: { userId_provider: { userId, provider: 'liftosaur' } }
    })
    if (!integration?.accessToken) {
      throw new IntegrationAuthError({
        provider: 'liftosaur',
        integrationId: integration?.id || 'missing',
        code: 'AUTH_MISSING',
        message: 'Liftosaur integration not found or missing API key.'
      })
    }

    const settings = (integration.settings as Record<string, any> | null) || {}
    const ingestWorkouts = shouldIngestActivities('liftosaur', integration.ingestWorkouts, settings)
    const ingestMeasurements = settings.ingestMeasurements === true

    await prisma.integration.update({
      where: { id: integration.id },
      data: { syncStatus: 'SYNCING', errorMessage: null }
    })

    let newWorkouts = 0
    let skipped = 0
    let wellnessCount = 0

    try {
      if (ingestWorkouts) {
        const records = await fetchAllLiftosaurHistory(integration.accessToken, {
          startDate,
          endDate
        })
        logger.log(`[Liftosaur] Fetched ${records.length} history records`)

        for (const record of records) {
          try {
            const parsed = parseLiftosaurWorkout(record.text)
            if (parsed.exercises.length === 0) {
              throw new Error('Liftosaur workout contains no parseable exercises.')
            }
            const externalId = String(record.id)
            const existing = await prisma.workout.findUnique({
              where: {
                userId_source_externalId: { userId, source: 'liftosaur', externalId }
              },
              select: { id: true }
            })

            await prisma.$transaction(async (tx) => {
              const workout = await tx.workout.upsert({
                where: {
                  userId_source_externalId: { userId, source: 'liftosaur', externalId }
                },
                create: {
                  userId,
                  source: 'liftosaur',
                  externalId,
                  date: parsed.date,
                  title: parsed.dayName || parsed.program || 'Liftosaur Strength Workout',
                  description: parsed.program
                    ? `${parsed.program}${parsed.dayName ? ` — ${parsed.dayName}` : ''}`
                    : parsed.dayName,
                  type: 'WeightTraining',
                  durationSec: parsed.durationSec,
                  rawJson: {
                    liftosaur: {
                      id: record.id,
                      text: record.text,
                      metadata: parsed.metadata,
                      warnings: parsed.warnings,
                      exercises: parsed.exercises
                    }
                  }
                },
                update: {
                  date: parsed.date,
                  title: parsed.dayName || parsed.program || 'Liftosaur Strength Workout',
                  description: parsed.program
                    ? `${parsed.program}${parsed.dayName ? ` — ${parsed.dayName}` : ''}`
                    : parsed.dayName,
                  type: 'WeightTraining',
                  durationSec: parsed.durationSec,
                  rawJson: {
                    liftosaur: {
                      id: record.id,
                      text: record.text,
                      metadata: parsed.metadata,
                      warnings: parsed.warnings,
                      exercises: parsed.exercises
                    }
                  }
                }
              })

              await tx.workoutExercise.deleteMany({ where: { workoutId: workout.id } })

              for (const [exerciseOrder, parsedExercise] of parsed.exercises.entries()) {
                const externalExerciseId = exerciseExternalId(
                  parsedExercise.name,
                  parsedExercise.equipment
                )
                const exercise = await tx.exercise.upsert({
                  where: { externalId: externalExerciseId },
                  create: {
                    externalId: externalExerciseId,
                    title: parsedExercise.equipment
                      ? `${parsedExercise.name}, ${parsedExercise.equipment}`
                      : parsedExercise.name,
                    type: 'strength',
                    secondaryMuscles: []
                  },
                  update: {
                    title: parsedExercise.equipment
                      ? `${parsedExercise.name}, ${parsedExercise.equipment}`
                      : parsedExercise.name
                  }
                })

                const workoutExercise = await tx.workoutExercise.create({
                  data: {
                    workoutId: workout.id,
                    exerciseId: exercise.id,
                    order: exerciseOrder,
                    notes: parsedExercise.target
                      ? `Liftosaur target: ${parsedExercise.target}`
                      : null
                  }
                })

                if (parsedExercise.sets.length > 0) {
                  await tx.workoutSet.createMany({
                    data: parsedExercise.sets.map((set, setOrder) => ({
                      workoutExerciseId: workoutExercise.id,
                      order: setOrder,
                      type: set.type,
                      reps: set.reps,
                      weight: set.weight,
                      weightUnit: set.weightUnit,
                      durationSec: set.durationSec,
                      rpe: set.rpe
                    }))
                  })
                }
              }
            })

            if (!existing) newWorkouts++
            if (parsed.warnings.length > 0) {
              logger.warn(`[Liftosaur] Parsed record ${externalId} with warnings`, {
                warnings: parsed.warnings
              })
            }
          } catch (error) {
            skipped++
            logger.warn(`[Liftosaur] Skipped history record ${String(record.id)}`, {
              error: error instanceof Error ? error.message : String(error)
            })
          }
        }
      }

      if (ingestMeasurements) {
        const [weights, bodyFatValues] = await Promise.all([
          fetchMeasurementWindow(integration.accessToken, 'weight', rangeStart, rangeEnd),
          fetchMeasurementWindow(integration.accessToken, 'bodyfat', rangeStart, rangeEnd)
        ])
        const days = new Map<string, LiftosaurMeasurementDay>()

        for (const [key, values] of [
          ['weight', weights],
          ['bodyfat', bodyFatValues]
        ] as const) {
          for (const measurement of values) {
            const parsedValue = parseLiftosaurMeasurementValue(measurement.value)
            const measuredAt = new Date(measurement.date)
            if (!parsedValue || Number.isNaN(measuredAt.getTime())) {
              skipped++
              continue
            }

            const date = dateOnly(measuredAt)
            const dateKey = date.toISOString().slice(0, 10)
            const day = days.get(dateKey) || { date, raw: {} }
            day.raw[key] = measurement
            if (key === 'weight' && parsedValue.unit === 'kg') {
              day.weight = roundToTwoDecimals(parsedValue.value)
            }
            if (key === 'bodyfat' && parsedValue.unit === 'pct') {
              day.bodyFat = roundToTwoDecimals(parsedValue.value)
            }
            days.set(dateKey, day)
          }
        }

        let latestWeight: { value: number; date: Date } | null = null
        for (const day of days.values()) {
          const wellnessData = {
            userId,
            date: day.date,
            weight: day.weight,
            bodyFat: day.bodyFat,
            rawJson: { liftosaur: { measurements: day.raw } }
          }
          const { record } = await wellnessRepository.upsert(
            userId,
            day.date,
            wellnessData as any,
            wellnessData as any,
            'liftosaur'
          )
          await bodyMeasurementService.recordWellnessMetrics(userId, record, 'liftosaur')
          wellnessCount++

          if (day.weight !== undefined && (!latestWeight || day.date > latestWeight.date)) {
            latestWeight = { value: day.weight, date: day.date }
          }
        }

        if (latestWeight && Date.now() - latestWeight.date.getTime() < 7 * 24 * 60 * 60 * 1000) {
          await athleteMetricsService.updateMetrics(
            userId,
            { weight: latestWeight.value, date: latestWeight.date },
            { weightUpdateSource: 'sync' }
          )
        }
      }

      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          syncStatus: 'SUCCESS',
          lastSyncAt: new Date(),
          errorMessage:
            skipped > 0 ? `${skipped} Liftosaur record(s) could not be imported.` : null,
          initialSyncCompleted: true
        }
      })

      return {
        success: true,
        counts: { workouts: newWorkouts, wellness: wellnessCount },
        skipped,
        userId,
        startDate,
        endDate
      }
    } catch (error) {
      const normalizedError = providerError(error, integration.id)
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          syncStatus: 'FAILED',
          errorMessage:
            normalizedError instanceof Error ? normalizedError.message : 'Liftosaur sync failed.'
        }
      })
      throw normalizedError
    }
  }
})
