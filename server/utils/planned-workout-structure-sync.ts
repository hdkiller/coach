import { createHash } from 'node:crypto'
import { Prisma } from '@prisma/client'

type StructureEditSource = 'USER' | 'AI' | 'REMOTE_IMPORT' | 'PUBLISH'

type PlannedWorkoutStructureState = {
  structuredWorkout?: unknown
  durationSec?: number | null
  modifiedLocally?: boolean | null
  lastStructureEditedAt?: Date | null
  lastStructurePublishedAt?: Date | null
  structureHash?: string | null
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson)
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = sortJson((value as Record<string, unknown>)[key])
          return acc
        },
        {} as Record<string, unknown>
      )
  }
  return value
}

function hasStructuredWorkoutContent(structuredWorkout: unknown): boolean {
  if (!structuredWorkout || typeof structuredWorkout !== 'object') return false
  const value = structuredWorkout as Record<string, unknown>

  for (const key of ['steps', 'exercises', 'blocks'] as const) {
    const entries = value[key]
    if (Array.isArray(entries) && entries.length > 0) return true
  }

  return false
}

function getStructuredWorkoutStepDurationSec(structuredWorkout: unknown): number | null {
  if (!structuredWorkout || typeof structuredWorkout !== 'object') return null

  const readPositiveInt = (value: unknown): number => {
    const numeric = Number(value)
    return Number.isFinite(numeric) && numeric > 0 ? Math.trunc(numeric) : 0
  }

  const walk = (steps: unknown): number => {
    if (!Array.isArray(steps)) return 0

    return steps.reduce((total, step) => {
      if (!step || typeof step !== 'object') return total
      const value = step as Record<string, unknown>
      const reps = readPositiveInt(value.reps) || readPositiveInt(value.repeat) || 1
      const nestedDuration = walk(value.steps)
      const ownDuration =
        nestedDuration || readPositiveInt(value.durationSeconds) || readPositiveInt(value.duration)

      return total + ownDuration * reps
    }, 0)
  }

  const duration = walk((structuredWorkout as Record<string, unknown>).steps)
  return duration > 0 ? duration : null
}

function durationMatches(expected: number, actual: number | null): boolean {
  if (!actual || expected <= 0) return false
  return Math.abs(actual - expected) <= Math.max(60, expected * 0.02)
}

export function computeStructuredWorkoutHash(structuredWorkout: unknown): string | null {
  if (!structuredWorkout || typeof structuredWorkout !== 'object') return null
  const normalized = JSON.stringify(sortJson(structuredWorkout))
  return createHash('sha256').update(normalized).digest('hex')
}

export function buildStructureEditFields(
  structuredWorkout: unknown,
  source: StructureEditSource,
  now = new Date()
) {
  return {
    structuredWorkout: structuredWorkout as any,
    modifiedLocally: source !== 'REMOTE_IMPORT',
    lastStructureEditedAt: now,
    lastStructureEditSource: source,
    structureHash: computeStructuredWorkoutHash(structuredWorkout),
    syncConflict: false,
    pendingRemoteStructuredWorkout: Prisma.DbNull
  }
}

export function buildStructurePublishFields(structuredWorkout: unknown, now = new Date()) {
  const structureHash = computeStructuredWorkoutHash(structuredWorkout)
  return {
    modifiedLocally: false,
    lastStructurePublishedAt: now,
    lastStructureEditSource: 'PUBLISH',
    syncConflict: false,
    pendingRemoteStructuredWorkout: Prisma.DbNull,
    ...(structureHash ? { structureHash } : {})
  }
}

export function buildRemoteStructureCreateFields(structuredWorkout: unknown, now = new Date()) {
  return {
    modifiedLocally: false,
    lastStructureEditedAt: now,
    lastStructureEditSource: 'REMOTE_IMPORT',
    lastRemoteStructureSeenAt: now,
    structureHash: computeStructuredWorkoutHash(structuredWorkout),
    remoteStructureHash: computeStructuredWorkoutHash(structuredWorkout),
    syncConflict: false,
    pendingRemoteStructuredWorkout: Prisma.DbNull
  }
}

export function shouldAcceptRemoteStructure(
  local: PlannedWorkoutStructureState | null | undefined,
  remoteStructuredWorkout: unknown
) {
  if (!remoteStructuredWorkout || typeof remoteStructuredWorkout !== 'object') {
    return { accept: false, reason: 'remote_missing_structure' as const }
  }

  if (!local) {
    return { accept: true, reason: 'new_local_record' as const }
  }

  if (
    !hasStructuredWorkoutContent(local.structuredWorkout) &&
    hasStructuredWorkoutContent(remoteStructuredWorkout)
  ) {
    return { accept: true, reason: 'local_missing_structure' as const }
  }

  const plannedDurationSec = Number(local.durationSec || 0)
  const localDurationSec = getStructuredWorkoutStepDurationSec(local.structuredWorkout)
  const remoteDurationSec = getStructuredWorkoutStepDurationSec(remoteStructuredWorkout)
  if (
    plannedDurationSec > 0 &&
    !durationMatches(plannedDurationSec, localDurationSec) &&
    durationMatches(plannedDurationSec, remoteDurationSec)
  ) {
    return { accept: true, reason: 'local_structure_duration_mismatch' as const }
  }

  if (local.modifiedLocally) {
    return { accept: false, reason: 'local_modified' as const }
  }

  if (
    local.lastStructureEditedAt &&
    (!local.lastStructurePublishedAt ||
      local.lastStructureEditedAt > local.lastStructurePublishedAt)
  ) {
    return { accept: false, reason: 'local_unpublished_changes' as const }
  }

  const remoteHash = computeStructuredWorkoutHash(remoteStructuredWorkout)
  if (remoteHash && local.structureHash && remoteHash === local.structureHash) {
    return { accept: false, reason: 'same_hash' as const }
  }

  return { accept: true, reason: 'remote_newer_or_local_clean' as const }
}

export function buildRemoteStructureMergeFields(
  local: PlannedWorkoutStructureState | null | undefined,
  remoteStructuredWorkout: unknown,
  now = new Date()
) {
  const decision = shouldAcceptRemoteStructure(local, remoteStructuredWorkout)
  const remoteHash = computeStructuredWorkoutHash(remoteStructuredWorkout)

  if (decision.accept) {
    return {
      decision,
      fields: {
        structuredWorkout: remoteStructuredWorkout as any,
        modifiedLocally: false,
        lastStructureEditedAt: now,
        lastStructureEditSource: 'REMOTE_IMPORT',
        lastRemoteStructureSeenAt: now,
        structureHash: remoteHash,
        remoteStructureHash: remoteHash,
        syncConflict: false,
        pendingRemoteStructuredWorkout: Prisma.DbNull
      }
    }
  }

  return {
    decision,
    fields: {
      lastRemoteStructureSeenAt: now,
      remoteStructureHash: remoteHash,
      ...(decision.reason === 'same_hash'
        ? {
            syncConflict: false,
            pendingRemoteStructuredWorkout: Prisma.DbNull
          }
        : {
            syncConflict: true,
            pendingRemoteStructuredWorkout: remoteStructuredWorkout as any
          })
    }
  }
}
