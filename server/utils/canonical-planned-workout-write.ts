import type { Prisma } from '@prisma/client'
import { prisma } from './db'
import {
  buildRemoteStructureMergeFields,
  buildStructureEditFields,
  computeStructuredWorkoutHash
} from './planned-workout-structure-sync'
import {
  computeStructuredWorkoutMetrics,
  getPendingSyncStatus
} from './structured-workout-persistence'
import { resolveWorkoutTargeting } from '../../trigger/utils/workout-targeting'
import {
  adaptStructuredWorkout,
  createZoneProfileSnapshot,
  validateStructuredWorkoutLimits,
  type StructureSource,
  type ZoneProfileSnapshot
} from '../../shared/structured-workout-contract'
import { validateCanonicalSemantics } from '../../shared/workout-canonical-validation'
import { supersedeActiveStructureGenerationRuns } from './structure-generation-run'

type WriteSource = Extract<
  StructureSource,
  'AI_GENERATION' | 'MANUAL_EDIT' | 'INTERVALS_IMPORT' | 'TEMPLATE' | 'LEGACY_ADAPTER'
>
type DbClient = Prisma.TransactionClient | typeof prisma

export type CanonicalWriteOptions = {
  source: WriteSource
  structure: unknown
  syncStatus?: string | null
  zoneProfileSnapshot?: ZoneProfileSnapshot
  refs?: { ftp: number; lthr: number; maxHr: number; thresholdPace: number }
  fallbackOrder?: Array<'power' | 'heartRate' | 'pace' | 'rpe'>
  preservePlannedDuration?: number | null
  extra?: Record<string, unknown>
  /** Skip diagnostics rejection for message-only or partial envelope updates. */
  allowDiagnostics?: boolean
  incrementRevision?: boolean
}

function mapEditSource(source: WriteSource) {
  if (source === 'INTERVALS_IMPORT') return 'REMOTE_IMPORT' as const
  if (source === 'AI_GENERATION') return 'AI' as const
  return 'USER' as const
}

function resolveSportTargetingRefs(sportSettings?: any) {
  const { targetPolicy } = resolveWorkoutTargeting(sportSettings || {})
  return {
    refs: {
      ftp: Number(sportSettings?.ftp || 250),
      lthr: Number(sportSettings?.lthr || 0),
      maxHr: Number(sportSettings?.maxHr || 0),
      thresholdPace: Number(sportSettings?.thresholdPace || 0)
    },
    fallbackOrder: targetPolicy.fallbackOrder as Array<'power' | 'heartRate' | 'pace' | 'rpe'>
  }
}

/** Builds the Prisma update payload for a canonical structure write. */
export function buildCanonicalPlannedWorkoutWriteData(options: CanonicalWriteOptions) {
  const canonical = adaptStructuredWorkout(options.structure, {
    source: options.source,
    zoneProfileSnapshot: options.zoneProfileSnapshot || createZoneProfileSnapshot({})
  })
  if (!canonical) throw createError({ statusCode: 400, message: 'Invalid structured workout' })
  const limitIssues = validateStructuredWorkoutLimits(canonical)
  const semanticIssues =
    options.source === 'AI_GENERATION' || options.source === 'MANUAL_EDIT'
      ? validateCanonicalSemantics(canonical)
      : []
  const issues = [
    ...limitIssues,
    ...semanticIssues,
    ...(options.allowDiagnostics ? [] : canonical.diagnostics || [])
  ]
  if (issues.length) {
    throw createError({ statusCode: 422, message: issues[0]!.message, data: { issues } })
  }
  const metrics = computeStructuredWorkoutMetrics(canonical, {
    refs: options.refs || { ftp: 0, lthr: 0, maxHr: 0, thresholdPace: 0 },
    fallbackOrder: options.fallbackOrder || ['power', 'heartRate', 'pace', 'rpe']
  })
  const editSource = mapEditSource(options.source)
  const data: Record<string, unknown> = {
    ...buildStructureEditFields(canonical, editSource),
    ...(options.incrementRevision !== false ? { structureRevision: { increment: 1 } } : {}),
    durationSec: options.preservePlannedDuration || metrics.durationSec || undefined,
    distanceMeters: metrics.distanceMeters || undefined,
    tss: metrics.tss || undefined,
    workIntensity: metrics.workIntensity || undefined,
    syncStatus:
      options.source === 'INTERVALS_IMPORT' ? 'SYNCED' : getPendingSyncStatus(options.syncStatus),
    syncError: null,
    ...(options.extra || {})
  }
  return { canonical, metrics, data }
}

/** Canonical fields for accepted Intervals import create/update paths. */
export function buildRemoteImportAcceptedWriteData(options: {
  structure: unknown
  zoneProfileSnapshot?: ZoneProfileSnapshot
  sportSettings?: any
  preservePlannedDuration?: number | null
  seenAt?: Date
  allowDiagnostics?: boolean
  incrementRevision?: boolean
}) {
  const { refs, fallbackOrder } = resolveSportTargetingRefs(options.sportSettings)
  const seenAt = options.seenAt || new Date()
  const result = buildCanonicalPlannedWorkoutWriteData({
    source: 'INTERVALS_IMPORT',
    structure: options.structure,
    zoneProfileSnapshot: options.zoneProfileSnapshot,
    refs,
    fallbackOrder,
    preservePlannedDuration: options.preservePlannedDuration,
    allowDiagnostics: options.allowDiagnostics ?? true,
    incrementRevision: options.incrementRevision ?? true,
    syncStatus: 'SYNCED',
    extra: { lastRemoteStructureSeenAt: seenAt }
  })
  return {
    ...result,
    data: {
      ...result.data,
      remoteStructureHash: computeStructuredWorkoutHash(result.canonical)
    }
  }
}

/** Canonical fields when scheduling/copying template workouts. */
export function buildTemplateStructureWriteData(options: {
  structure: unknown
  sportSettings?: any
  preservePlannedDuration?: number | null
  allowDiagnostics?: boolean
  syncStatus?: string | null
}) {
  const { refs, fallbackOrder } = resolveSportTargetingRefs(options.sportSettings)
  return buildCanonicalPlannedWorkoutWriteData({
    source: 'TEMPLATE',
    structure: options.structure,
    zoneProfileSnapshot: createZoneProfileSnapshot(options.sportSettings || {}),
    refs,
    fallbackOrder,
    preservePlannedDuration: options.preservePlannedDuration,
    allowDiagnostics: options.allowDiagnostics ?? true,
    incrementRevision: false,
    syncStatus: options.syncStatus ?? 'LOCAL_ONLY'
  })
}

/** Canonical fields for legacy data restore imports. */
export function buildLegacyAdapterWriteData(options: {
  structure: unknown
  preservePlannedDuration?: number | null
}) {
  return buildCanonicalPlannedWorkoutWriteData({
    source: 'LEGACY_ADAPTER',
    structure: options.structure,
    allowDiagnostics: true,
    incrementRevision: false,
    syncStatus: 'LOCAL_ONLY',
    preservePlannedDuration: options.preservePlannedDuration
  })
}

function stripDerivedMetricsForLocalConflict(updateData: Record<string, unknown>) {
  delete updateData.durationSec
  delete updateData.distanceMeters
  delete updateData.tss
  delete updateData.workIntensity
}

/** Merge remote import payloads with local conflict rules and canonical accepted writes. */
export function buildIntervalsImportPersistenceFields(options: {
  existingRecord: any | null | undefined
  normalizedPlanned: Record<string, any>
  sportSettings: any
  seenAt: Date
}) {
  const { existingRecord, normalizedPlanned, sportSettings, seenAt } = options
  const newStruct = normalizedPlanned.structuredWorkout

  if (existingRecord) {
    const updateData: Record<string, any> = { ...normalizedPlanned }
    if (newStruct && typeof newStruct === 'object') {
      const remoteMerge = buildRemoteStructureMergeFields(existingRecord, newStruct, seenAt)
      if (remoteMerge.decision.accept) {
        const accepted = buildRemoteImportAcceptedWriteData({
          structure: newStruct,
          zoneProfileSnapshot: (newStruct as any).zoneProfileSnapshot,
          sportSettings,
          preservePlannedDuration: normalizedPlanned.durationSec ?? existingRecord.durationSec,
          seenAt
        })
        Object.assign(updateData, accepted.data)
      } else {
        if (!('structuredWorkout' in remoteMerge.fields)) {
          delete updateData.structuredWorkout
        }
        if (
          remoteMerge.decision.reason === 'local_modified' ||
          remoteMerge.decision.reason === 'local_unpublished_changes'
        ) {
          stripDerivedMetricsForLocalConflict(updateData)
        }
        Object.assign(updateData, remoteMerge.fields)
      }
    } else {
      updateData.lastRemoteStructureSeenAt = seenAt
    }
    return updateData
  }

  const createData: Record<string, any> = { ...normalizedPlanned }
  if (newStruct && typeof newStruct === 'object') {
    const accepted = buildRemoteImportAcceptedWriteData({
      structure: newStruct,
      zoneProfileSnapshot: (newStruct as any).zoneProfileSnapshot,
      sportSettings,
      preservePlannedDuration: normalizedPlanned.durationSec,
      seenAt,
      incrementRevision: false
    })
    Object.assign(createData, accepted.data)
  }
  return createData
}

/** Upsert Intervals planned workouts; avoids duplicate (userId, externalId) races. */
export async function persistIntervalsPlannedWorkoutImport(
  client: DbClient,
  options: {
    userId: string
    existingRecord: any | null | undefined
    normalizedPlanned: Record<string, any>
    sportSettings: any
    seenAt: Date
  }
) {
  const { userId, existingRecord, normalizedPlanned, sportSettings, seenAt } = options
  const externalId = normalizedPlanned.externalId

  if (existingRecord && existingRecord.externalId !== externalId) {
    await client.plannedWorkout.update({
      where: { id: existingRecord.id },
      data: buildIntervalsImportPersistenceFields({
        existingRecord,
        normalizedPlanned,
        sportSettings,
        seenAt
      })
    })
    return
  }

  const createData = buildIntervalsImportPersistenceFields({
    existingRecord: null,
    normalizedPlanned,
    sportSettings,
    seenAt
  }) as Prisma.PlannedWorkoutUncheckedCreateInput

  const recordForUpdate =
    existingRecord ??
    (await client.plannedWorkout.findUnique({
      where: { userId_externalId: { userId, externalId } }
    }))

  await client.plannedWorkout.upsert({
    where: { userId_externalId: { userId, externalId } },
    create: createData,
    update: buildIntervalsImportPersistenceFields({
      existingRecord: recordForUpdate,
      normalizedPlanned,
      sportSettings,
      seenAt
    })
  })
}

/**
 * Sole owner for planned-workout structure writes. The structure, derived metrics,
 * hash, revision, and sync intent are written together, optionally guarded by a
 * generation revision so late Trigger jobs cannot partially overwrite a newer edit.
 */
export async function writeCanonicalPlannedWorkoutStructure(
  options: CanonicalWriteOptions & {
    plannedWorkoutId: string
    expectedGenerationRevision?: number
    tx?: DbClient
  }
) {
  const { canonical, metrics, data } = buildCanonicalPlannedWorkoutWriteData(options)
  const client = options.tx || prisma

  if (options.source === 'MANUAL_EDIT' && options.incrementRevision !== false) {
    await supersedeActiveStructureGenerationRuns(options.plannedWorkoutId, options.tx)
    ;(data as any).generationRevision = { increment: 1 }
  }

  if (options.expectedGenerationRevision !== undefined) {
    const result = await client.plannedWorkout.updateMany({
      where: {
        id: options.plannedWorkoutId,
        generationRevision: options.expectedGenerationRevision
      },
      data
    })
    return { canonical, metrics, stale: result.count === 0 }
  }

  const workout = await client.plannedWorkout.update({
    where: { id: options.plannedWorkoutId },
    data
  })
  return { canonical, metrics, stale: false, workout }
}
