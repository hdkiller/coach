import { prisma } from './db'
import {
  createIntervalsPlannedWorkout,
  deleteIntervalsPlannedWorkout,
  normalizeIntervalsSportType,
  isIntervalsEventId,
  cleanIntervalsDescription
} from './intervals'
import { syncPlannedWorkoutToIntervals } from './intervals-sync'
import { plannedWorkoutRepository } from './repositories/plannedWorkoutRepository'
import { metabolicService } from './services/metabolicService'
import { isNutritionTrackingEnabled } from './nutrition/feature'
import { WorkoutConverter } from './workout-converter'
import { sportSettingsRepository } from './repositories/sportSettingsRepository'

export function normalizePlannedWorkoutDate(value: string | Date) {
  const rawDate = new Date(value)
  return new Date(Date.UTC(rawDate.getUTCFullYear(), rawDate.getUTCMonth(), rawDate.getUTCDate()))
}

async function buildWorkoutDoc(userId: string, workout: any, body: any) {
  const structuredWorkout = body?.structuredWorkout ?? workout?.structuredWorkout
  if (!structuredWorkout) return ''

  const intervalsType = normalizeIntervalsSportType(body?.type || workout?.type || 'Ride')
  const sportSettings = await sportSettingsRepository.getForActivityType(userId, intervalsType)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { ftp: true }
  })

  return WorkoutConverter.toIntervalsICU({
    title: body?.title || workout?.title || 'Workout',
    description: body?.description ?? workout?.description ?? '',
    type: intervalsType,
    steps: structuredWorkout?.steps || [],
    exercises: structuredWorkout?.exercises,
    messages: structuredWorkout?.messages || [],
    ftp: user?.ftp || 250,
    sportSettings: sportSettings || undefined,
    generationSettingsSnapshot:
      workout?.lastGenerationSettingsSnapshot || workout?.createdFromSettingsSnapshot || null
  })
}

async function getPlannedWorkoutSyncSettings(userId: string) {
  const integration = await prisma.integration.findFirst({
    where: { userId, provider: 'intervals' }
  })
  const settings = (integration?.settings as any) || {}
  return {
    integration,
    importPlannedWorkouts: settings.importPlannedWorkouts !== false
  }
}

export async function createPlannedWorkoutForUser(userId: string, body: any) {
  if (!body.date || !body.title) {
    throw createError({ statusCode: 400, message: 'Date and title are required' })
  }

  const forcedDate = normalizePlannedWorkoutDate(body.date)
  const workoutDoc = await buildWorkoutDoc(userId, null, body)
  const { integration, importPlannedWorkouts } = await getPlannedWorkoutSyncSettings(userId)

  let intervalsWorkout = null
  let externalId = `adhoc-${Date.now()}`
  let syncStatus = 'LOCAL_ONLY'

  if (integration && importPlannedWorkouts) {
    try {
      intervalsWorkout = await createIntervalsPlannedWorkout(integration, {
        date: forcedDate,
        startTime: body.startTime,
        title: body.title,
        description: body.description,
        type: body.type || 'Ride',
        category: body.category,
        durationSec: body.durationSec,
        tss: body.tss,
        workout_doc: workoutDoc || undefined
      })
      externalId = String(intervalsWorkout.id)
      syncStatus = 'SYNCED'
    } catch (error) {
      console.error('Failed to sync to Intervals.icu:', error)
      syncStatus = 'PENDING'
    }
  }

  const plannedWorkout = await plannedWorkoutRepository.create({
    userId,
    externalId,
    date: forcedDate,
    startTime: body.startTime,
    title: body.title,
    description: body.description || '',
    type: body.type || 'Ride',
    category: body.category,
    durationSec: body.durationSec || 3600,
    tss: body.tss,
    workIntensity: body.workIntensity,
    fuelingStrategy: body.fuelingStrategy || 'STANDARD',
    completed: false,
    syncStatus,
    structuredWorkout: body.structuredWorkout ?? undefined,
    rawJson: intervalsWorkout || {}
  })

  try {
    if (await isNutritionTrackingEnabled(userId)) {
      await metabolicService.calculateFuelingPlanForDate(userId, forcedDate, { persist: true })
    }
  } catch (err) {
    console.error('[PlannedWorkoutCreate] Failed to trigger regeneration:', err)
  }

  return {
    success: true,
    workout: plannedWorkout
  }
}

export async function updatePlannedWorkoutForUser(userId: string, workoutId: string, body: any) {
  const existing = await plannedWorkoutRepository.getById(workoutId, userId)
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Workout not found' })
  }

  const forcedDate = body.date ? normalizePlannedWorkoutDate(body.date) : undefined
  const { importPlannedWorkouts } = await getPlannedWorkoutSyncSettings(userId)

  const updated = await plannedWorkoutRepository.update(workoutId, userId, {
    ...(forcedDate && { date: forcedDate }),
    ...(body.title && { title: body.title }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.type && { type: body.type }),
    ...(body.startTime !== undefined && { startTime: body.startTime }),
    ...(body.durationSec && { durationSec: body.durationSec }),
    ...(body.duration_minutes && { durationSec: body.duration_minutes * 60 }),
    ...(body.tss !== undefined && { tss: body.tss }),
    ...(body.workIntensity !== undefined && { workIntensity: body.workIntensity }),
    ...(body.fuelingStrategy !== undefined && { fuelingStrategy: body.fuelingStrategy }),
    ...(body.structuredWorkout !== undefined && { structuredWorkout: body.structuredWorkout }),
    modifiedLocally: true,
    ...(importPlannedWorkouts && { syncStatus: 'PENDING' })
  })

  try {
    if (await isNutritionTrackingEnabled(userId)) {
      await metabolicService.calculateFuelingPlanForDate(userId, forcedDate || updated.date, {
        persist: true
      })
    }
  } catch (err) {
    console.error('[PlannedWorkoutUpdate] Failed to trigger regeneration:', err)
  }

  const isLocal = existing.syncStatus === 'LOCAL_ONLY' || !isIntervalsEventId(existing.externalId)
  const workoutDoc = await buildWorkoutDoc(userId, updated, body)
  const cleanDescription = cleanIntervalsDescription(updated.description || '')

  if (importPlannedWorkouts) {
    const syncResult = await syncPlannedWorkoutToIntervals(
      isLocal ? 'CREATE' : 'UPDATE',
      {
        id: updated.id,
        externalId: updated.externalId,
        date: updated.date,
        startTime: updated.startTime,
        title: updated.title,
        description: cleanDescription,
        type: updated.type,
        durationSec: updated.durationSec,
        tss: updated.tss,
        workout_doc: workoutDoc,
        managedBy: updated.managedBy
      },
      userId
    )

    const finalWorkout = await plannedWorkoutRepository.update(workoutId, userId, {
      syncStatus: syncResult.synced ? 'SYNCED' : 'PENDING',
      lastSyncedAt: syncResult.synced ? new Date() : undefined,
      syncError: syncResult.error || null,
      ...(syncResult.synced &&
        syncResult.result?.id && {
          externalId: String(syncResult.result.id)
        })
    })

    return {
      success: true,
      workout: finalWorkout,
      syncStatus: syncResult.synced ? 'synced' : 'pending',
      message: syncResult.message || 'Workout updated successfully'
    }
  }

  return {
    success: true,
    workout: updated,
    syncStatus: 'local',
    message: 'Workout updated locally (sync disabled)'
  }
}

export async function deletePlannedWorkoutForUser(userId: string, workoutId: string) {
  const workout = await plannedWorkoutRepository.getById(workoutId, userId)
  if (!workout) {
    throw createError({ statusCode: 404, message: 'Workout not found' })
  }

  const { integration, importPlannedWorkouts } = await getPlannedWorkoutSyncSettings(userId)
  if (integration && workout.externalId && importPlannedWorkouts) {
    try {
      await deleteIntervalsPlannedWorkout(integration, workout.externalId)
    } catch (error) {
      console.error('Failed to delete from Intervals.icu:', error)
    }
  }

  await plannedWorkoutRepository.delete(workoutId, userId)

  try {
    if (await isNutritionTrackingEnabled(userId)) {
      await metabolicService.calculateFuelingPlanForDate(userId, workout.date, { persist: true })
    }
  } catch (err) {
    console.error('[PlannedWorkoutDelete] Failed to trigger regeneration:', err)
  }

  return {
    success: true,
    message: 'Workout deleted successfully'
  }
}

export async function movePlannedWorkoutForUser(
  userId: string,
  workoutId: string,
  targetDateInput: string
) {
  const sourceWorkout = await prisma.plannedWorkout.findUnique({
    where: { id: workoutId }
  })

  if (!sourceWorkout || sourceWorkout.userId !== userId) {
    throw createError({ statusCode: 404, message: 'Workout not found' })
  }

  const targetDate = normalizePlannedWorkoutDate(targetDateInput)
  const conflictingWorkout = await prisma.plannedWorkout.findFirst({
    where: {
      userId,
      date: targetDate,
      id: { not: workoutId }
    }
  })

  await prisma.$transaction(async (tx) => {
    if (conflictingWorkout) {
      await tx.plannedWorkout.update({
        where: { id: conflictingWorkout.id },
        data: { date: sourceWorkout.date }
      })
    }

    await tx.plannedWorkout.update({
      where: { id: workoutId },
      data: { date: targetDate }
    })
  })

  return { success: true }
}
