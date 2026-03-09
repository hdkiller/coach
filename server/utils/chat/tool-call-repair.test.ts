import { describe, expect, it } from 'vitest'
import { findToolNameRepair } from './tool-call-repair'

describe('findToolNameRepair', () => {
  const availableToolNames = [
    'delete_planned_workout',
    'get_planned_workouts',
    'update_planned_workout'
  ]

  it('repairs a single-character typo to a unique known tool', () => {
    expect(findToolNameRepair('delet_planned_workout', availableToolNames)).toEqual({
      repairedName: 'delete_planned_workout',
      strategy: 'edit-distance',
      distance: 1
    })
  })

  it('repairs normalized variants of a known tool', () => {
    expect(findToolNameRepair('Delete Planned Workout', availableToolNames)).toEqual({
      repairedName: 'delete_planned_workout',
      strategy: 'normalized'
    })
  })

  it('does not repair ambiguous candidates', () => {
    expect(findToolNameRepair('planned_workout', availableToolNames)).toBeNull()
  })

  it('does not repair unrelated tool names', () => {
    expect(findToolNameRepair('send_email', availableToolNames)).toBeNull()
  })
})
