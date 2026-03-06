import { describe, expect, it } from 'vitest'
import {
  buildRemoteStructureCreateFields,
  buildRemoteStructureMergeFields,
  buildStructureEditFields,
  buildStructurePublishFields,
  computeStructuredWorkoutHash
} from '../../../../server/utils/planned-workout-structure-sync'

describe('planned workout structure sync helpers', () => {
  it('marks local structure edits as modified locally with a stable hash', () => {
    const structure = { steps: [{ type: 'Active', power: { value: 1.1, units: '%' } }] }

    const fields = buildStructureEditFields(structure, 'USER', new Date('2026-03-06T12:00:00Z'))

    expect(fields.modifiedLocally).toBe(true)
    expect(fields.lastStructureEditSource).toBe('USER')
    expect(fields.structureHash).toBe(computeStructuredWorkoutHash(structure))
  })

  it('marks publishes as clean without clearing the structure hash', () => {
    const structure = { steps: [{ type: 'Active', power: { value: 1.1, units: '%' } }] }

    const fields = buildStructurePublishFields(structure, new Date('2026-03-06T12:00:00Z'))

    expect(fields.modifiedLocally).toBe(false)
    expect(fields.lastStructureEditSource).toBe('PUBLISH')
    expect(fields.structureHash).toBe(computeStructuredWorkoutHash(structure))
  })

  it('rejects remote structure when local unpublished changes exist', () => {
    const local = {
      structuredWorkout: { steps: [{ type: 'Active', power: { value: 1.1, units: '%' } }] },
      modifiedLocally: true,
      lastStructureEditedAt: new Date('2026-03-06T12:00:00Z'),
      lastStructurePublishedAt: new Date('2026-03-06T11:00:00Z'),
      structureHash: 'local-hash'
    }
    const remote = { steps: [{ type: 'Active', power: { value: 0.82, units: '%' } }] }

    const result = buildRemoteStructureMergeFields(local, remote, new Date('2026-03-06T12:30:00Z'))

    expect(result.decision.accept).toBe(false)
    expect(result.fields).not.toHaveProperty('structuredWorkout')
    expect(result.fields.syncConflict).toBe(true)
    expect(result.fields.pendingRemoteStructuredWorkout).toEqual(remote)
  })

  it('accepts remote structure for a clean local record', () => {
    const local = {
      structuredWorkout: { steps: [{ type: 'Active', power: { value: 1.1, units: '%' } }] },
      modifiedLocally: false,
      lastStructureEditedAt: new Date('2026-03-06T10:00:00Z'),
      lastStructurePublishedAt: new Date('2026-03-06T10:00:00Z'),
      structureHash: 'old-hash'
    }
    const remote = { steps: [{ type: 'Active', power: { value: 0.9, units: '%' } }] }

    const result = buildRemoteStructureMergeFields(local, remote, new Date('2026-03-06T12:30:00Z'))

    expect(result.decision.accept).toBe(true)
    expect(result.fields.structuredWorkout).toEqual(remote)
    expect(result.fields.modifiedLocally).toBe(false)
    expect(result.fields.lastStructureEditSource).toBe('REMOTE_IMPORT')
  })

  it('initializes metadata for remote-created records', () => {
    const structure = { steps: [{ type: 'Warmup', power: { value: 0.6, units: '%' } }] }
    const fields = buildRemoteStructureCreateFields(structure, new Date('2026-03-06T12:00:00Z'))

    expect(fields.modifiedLocally).toBe(false)
    expect(fields.lastStructureEditSource).toBe('REMOTE_IMPORT')
    expect(fields.structureHash).toBe(computeStructuredWorkoutHash(structure))
    expect(fields.remoteStructureHash).toBe(computeStructuredWorkoutHash(structure))
  })
})
