import { createHash } from 'node:crypto'
import { Prisma } from '@prisma/client'

type StructureEditSource = 'USER' | 'AI' | 'REMOTE_IMPORT' | 'PUBLISH'

type PlannedWorkoutStructureState = {
  structuredWorkout?: unknown
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
