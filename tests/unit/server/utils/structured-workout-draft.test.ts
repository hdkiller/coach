import { describe, expect, it } from 'vitest'

import {
  compileWorkoutPlanDraftToStructure,
  isDraftStructuredWorkoutSupported
} from '../../../../server/utils/structured-workout-draft'

describe('structured workout draft compiler', () => {
  it('compiles single-target draft steps into structured workout steps', () => {
    const compiled = compileWorkoutPlanDraftToStructure({
      description: 'Threshold builder.',
      coachInstructions: 'Stay controlled early.',
      steps: [
        {
          type: 'Warmup',
          name: 'Ease in',
          intent: 'warmup',
          durationSeconds: 600,
          target: { metric: 'power', value: 0.6, units: '%' }
        },
        {
          type: 'Active',
          name: 'Threshold',
          intent: 'threshold',
          durationSeconds: 480,
          target: {
            metric: 'power',
            range: { start: 0.95, end: 1.0 },
            units: '%'
          }
        }
      ]
    })

    expect(compiled).toMatchObject({
      description: 'Threshold builder.',
      coachInstructions: 'Stay controlled early.',
      steps: [
        {
          type: 'Warmup',
          name: 'Ease in',
          intent: 'warmup',
          durationSeconds: 600,
          primaryTarget: 'power',
          power: { value: 0.6, units: '%' }
        },
        {
          type: 'Active',
          name: 'Threshold',
          intent: 'threshold',
          durationSeconds: 480,
          primaryTarget: 'power',
          power: { range: { start: 0.95, end: 1.0 }, units: '%' }
        }
      ]
    })
  })

  it('compiles repeated child steps and rpe targets', () => {
    const compiled = compileWorkoutPlanDraftToStructure({
      coachInstructions: 'Relax on recoveries.',
      steps: [
        {
          type: 'Active',
          name: 'Main set',
          reps: 4,
          steps: [
            {
              type: 'Active',
              name: 'On',
              durationSeconds: 60,
              target: { metric: 'rpe', value: 8 }
            },
            {
              type: 'Rest',
              name: 'Off',
              durationSeconds: 60,
              target: { metric: 'heartRate', value: 0.65, units: 'LTHR' }
            }
          ]
        }
      ]
    })

    expect(compiled.steps[0]).toMatchObject({
      reps: 4,
      steps: [
        {
          name: 'On',
          primaryTarget: 'rpe',
          rpe: 8
        },
        {
          name: 'Off',
          primaryTarget: 'heartRate',
          heartRate: { value: 0.65, units: 'LTHR' }
        }
      ]
    })
  })

  it('supports only ride and run types for draft generation', () => {
    expect(isDraftStructuredWorkoutSupported('Ride')).toBe(true)
    expect(isDraftStructuredWorkoutSupported('VirtualRide')).toBe(true)
    expect(isDraftStructuredWorkoutSupported('Run')).toBe(true)
    expect(isDraftStructuredWorkoutSupported('Swim')).toBe(false)
    expect(isDraftStructuredWorkoutSupported('WeightTraining')).toBe(false)
  })
})
