import { beforeEach, describe, expect, it, vi } from 'vitest'

import { prisma } from '../../../../server/utils/db'
import {
  buildCanonicalPlannedWorkoutWriteData,
  persistIntervalsPlannedWorkoutImport,
  writeCanonicalPlannedWorkoutStructure
} from '../../../../server/utils/canonical-planned-workout-write'
import { createZoneProfileSnapshot } from '../../../../shared/structured-workout-contract'

vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message)
  ;(error as any).statusCode = err.statusCode
  ;(error as any).data = err.data
  return error
})

vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    plannedWorkout: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn()
    }
  }
}))

vi.mock('../../../../server/utils/planned-workout-structure-sync', () => ({
  buildStructureEditFields: vi.fn((structure: unknown, source: string) => ({
    structuredWorkout: structure,
    lastStructureEditSource: source,
    structureHash: 'hash',
    modifiedLocally: source !== 'REMOTE_IMPORT',
    syncConflict: false
  }))
}))

vi.mock('../../../../server/utils/structured-workout-persistence', () => ({
  computeStructuredWorkoutMetrics: vi.fn(() => ({
    durationSec: 3600,
    distanceMeters: 7288,
    tss: 72,
    workIntensity: 0.85
  })),
  getPendingSyncStatus: vi.fn((status?: string | null) => status || 'PENDING')
}))

describe('canonical planned workout write', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds atomic structure, metrics, hash, and revision fields together', () => {
    const snapshot = createZoneProfileSnapshot({
      thresholdPace: 2.75,
      paceZones: [{ min: 2.2, max: 2.4, name: 'Z2' }]
    })
    const { canonical, data } = buildCanonicalPlannedWorkoutWriteData({
      source: 'MANUAL_EDIT',
      structure: {
        steps: [
          {
            duration: 3600,
            pace: {
              metric: 'pace',
              kind: 'zone',
              zone: 2,
              rangeMps: { min: 2.2, max: 2.4 },
              units: 'm/s'
            }
          }
        ]
      },
      zoneProfileSnapshot: snapshot,
      refs: { ftp: 250, lthr: 170, maxHr: 190, thresholdPace: 2.75 }
    })

    expect(canonical?.schemaVersion).toBe(1)
    expect(data).toMatchObject({
      durationSec: 3600,
      distanceMeters: 7288,
      tss: 72,
      workIntensity: 0.85,
      structureRevision: { increment: 1 },
      syncStatus: 'PENDING'
    })
  })

  it('rejects stale generation revision writes', async () => {
    vi.mocked(prisma.plannedWorkout.updateMany).mockResolvedValue({ count: 0 } as any)
    const result = await writeCanonicalPlannedWorkoutStructure({
      plannedWorkoutId: 'pw-1',
      source: 'AI_GENERATION',
      structure: { steps: [{ duration: 600, power: { value: 0.7, units: '%' } }] },
      expectedGenerationRevision: 3
    })
    expect(result.stale).toBe(true)
    expect(prisma.plannedWorkout.update).not.toHaveBeenCalled()
  })

  it('upserts Intervals planned workouts by userId and externalId', async () => {
    vi.mocked(prisma.plannedWorkout.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.plannedWorkout.upsert).mockResolvedValue({ id: 'pw-1' } as any)

    await persistIntervalsPlannedWorkoutImport(prisma, {
      userId: 'user-1',
      existingRecord: null,
      normalizedPlanned: {
        userId: 'user-1',
        externalId: 'i123',
        title: 'Endurance',
        date: new Date('2026-07-12')
      },
      sportSettings: {},
      seenAt: new Date('2026-07-12T12:00:00Z')
    })

    expect(prisma.plannedWorkout.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_externalId: { userId: 'user-1', externalId: 'i123' } }
      })
    )
    expect(prisma.plannedWorkout.update).not.toHaveBeenCalled()
  })
})
