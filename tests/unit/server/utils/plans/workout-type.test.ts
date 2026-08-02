import { describe, it, expect } from 'vitest'
import { normalizeGeneratedWorkoutType } from '../../../../../server/utils/plans/workout-type'

describe('normalizeGeneratedWorkoutType', () => {
  it('maps Gym to WeightTraining (DB/Intervals canonical type)', () => {
    expect(normalizeGeneratedWorkoutType('Gym')).toBe('WeightTraining')
  })

  it('passes canonical types through unchanged', () => {
    for (const type of ['Ride', 'Run', 'Swim', 'Rest', 'WeightTraining']) {
      expect(normalizeGeneratedWorkoutType(type)).toBe(type)
    }
  })
})
