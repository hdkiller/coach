import { z } from 'zod'
import { getServerSession } from '../../../../utils/session'
import { prisma } from '../../../../utils/db'
import { WorkoutParser } from '../../../../utils/workout-parser'
import { sportSettingsRepository } from '../../../../utils/repositories/sportSettingsRepository'
import { resolveWorkoutTargeting } from '../../../../../trigger/utils/workout-targeting'
import { normalizeStructuredWorkoutForPersistence } from '../../../../utils/structured-workout-persistence'
import { normalizeStructuredStrengthWorkout } from '../../../../utils/strength-exercise-library'
import {
  adaptStructuredWorkout,
  createZoneProfileSnapshot,
  validateStructuredWorkoutLimits
} from '../../../../../shared/structured-workout-contract'
import { writeCanonicalPlannedWorkoutStructure } from '../../../../utils/canonical-planned-workout-write'
import { hasActiveStructureGenerationRun } from '../../../../utils/structure-generation-run'
import { syncManualPlannedWorkoutStructureToIntervalsIfSynced } from '../../../../utils/planned-workout-manual-structure-edit'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  const userId = session.user.id

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Workout ID is required' })
  }

  const body = await readBody(event)
  const {
    text,
    steps: providedSteps,
    exercises: providedExercises,
    blocks: providedBlocks,
    durationSec: providedDurationSec
  } = body

  if (
    typeof text !== 'string' &&
    !Array.isArray(providedSteps) &&
    !Array.isArray(providedExercises) &&
    !Array.isArray(providedBlocks)
  ) {
    throw createError({
      statusCode: 400,
      message: 'Structure text, steps array, exercises array, or blocks array is required'
    })
  }

  // 1. Verify ownership
  const workout = await prisma.plannedWorkout.findUnique({
    where: { id },
    include: {
      user: {
        select: { ftp: true }
      }
    }
  })

  if (!workout) {
    throw createError({ statusCode: 404, message: 'Planned workout not found' })
  }

  if (workout.userId !== userId) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  if (await hasActiveStructureGenerationRun(id)) {
    throw createError({
      statusCode: 409,
      message:
        'Structure generation is still running for this workout. Wait for it to finish or regenerate before editing.'
    })
  }

  // 2. Parse text to JSON or use provided steps
  const steps = Array.isArray(providedSteps)
    ? providedSteps
    : typeof text === 'string'
      ? WorkoutParser.parseIntervalsICU(text, { workoutType: workout.type || '' })
      : []
  const rawStrengthStructure =
    Array.isArray(providedExercises) || Array.isArray(providedBlocks)
      ? {
          ...((workout.structuredWorkout as any) || {}),
          ...(Array.isArray(providedBlocks) ? { blocks: providedBlocks } : {}),
          ...(Array.isArray(providedExercises) ? { exercises: providedExercises } : {})
        }
      : null

  const incomingStructure = rawStrengthStructure || { steps }
  const incomingLimitIssues = validateStructuredWorkoutLimits(incomingStructure)
  if (incomingLimitIssues.length > 0) {
    throw createError({
      statusCode: 400,
      message: incomingLimitIssues[0]!.message,
      data: { issues: incomingLimitIssues }
    })
  }

  let normalizedStrengthStructure: any = null
  if (rawStrengthStructure) {
    try {
      normalizedStrengthStructure = normalizeStructuredStrengthWorkout(rawStrengthStructure)
    } catch (error: any) {
      throw createError({
        statusCode: 400,
        message: error?.message || 'Invalid strength exercise payload'
      })
    }
  }

  const structuredWorkout = {
    ...((workout.structuredWorkout as any) || {}),
    ...(Array.isArray(providedSteps) || typeof text === 'string' ? { steps } : {}),
    ...(normalizedStrengthStructure || {})
  }
  const sportSettings = await sportSettingsRepository.getForActivityType(userId, workout.type || '')
  const { targetPolicy, targetFormatPolicy } = resolveWorkoutTargeting(sportSettings)
  const refs = {
    ftp: Number(sportSettings?.ftp || (workout.user as any)?.ftp || 250),
    lthr: Number(sportSettings?.lthr || 0),
    maxHr: Number(sportSettings?.maxHr || 0),
    thresholdPace: Number(sportSettings?.thresholdPace || 0),
    hrZones: Array.isArray(sportSettings?.hrZones) ? sportSettings.hrZones : [],
    powerZones: Array.isArray(sportSettings?.powerZones) ? sportSettings.powerZones : [],
    paceZones: Array.isArray(sportSettings?.paceZones) ? sportSettings.paceZones : []
  }
  const normalized = normalizeStructuredWorkoutForPersistence(structuredWorkout, {
    refs,
    targetPolicy,
    targetFormatPolicy,
    workoutType: workout.type || ''
  })
  const canonical = adaptStructuredWorkout(normalized, {
    source: 'MANUAL_EDIT',
    forceReadapt: true,
    zoneProfileSnapshot: createZoneProfileSnapshot(sportSettings)
  })
  if (!canonical || canonical.diagnostics?.length) {
    throw createError({
      statusCode: 422,
      message: 'Structure has unresolved targets. Declare target units before saving.',
      data: { diagnostics: canonical?.diagnostics || [] }
    })
  }
  const normalizedLimitIssues = validateStructuredWorkoutLimits(canonical)
  if (normalizedLimitIssues.length > 0) {
    throw createError({
      statusCode: 400,
      message: normalizedLimitIssues[0]!.message,
      data: { issues: normalizedLimitIssues }
    })
  }

  // 3. Update DB
  const persisted = await writeCanonicalPlannedWorkoutStructure({
    plannedWorkoutId: id,
    source: 'MANUAL_EDIT',
    structure: canonical,
    zoneProfileSnapshot: canonical.zoneProfileSnapshot,
    syncStatus: workout.syncStatus,
    refs,
    fallbackOrder: targetPolicy.fallbackOrder as Array<'power' | 'heartRate' | 'pace' | 'rpe'>,
    preservePlannedDuration:
      Number.isFinite(Number(providedDurationSec)) && Number(providedDurationSec) > 0
        ? Math.round(Number(providedDurationSec))
        : workout.durationSec
  })
  const updatedWorkout = persisted.workout!

  const sync = await syncManualPlannedWorkoutStructureToIntervalsIfSynced({
    userId,
    plannedWorkoutId: id,
    priorSyncStatus: workout.syncStatus,
    updatedWorkout,
    canonical,
    sportSettings,
    liveUserFtp: (workout.user as any)?.ftp
  })

  return {
    success: true,
    workout: sync.synced
      ? await prisma.plannedWorkout.findUnique({ where: { id } })
      : updatedWorkout,
    intervals_synced: sync.synced
  }
})
