import { describe, expect, it } from 'vitest'
import { enforceCyclingCadenceVariation, resolveCyclingCadence } from './cadence'

describe('resolveCyclingCadence', () => {
  it('maps 95/85 cadence hints to high and recovery nested steps', () => {
    const parent = {
      name: 'Neuromuscular Focus (5x5min @ 95+ RPM)',
      targetSplit: 'Vary Cadence 95/85 RPM'
    }

    const highStep = { type: 'Active', name: 'High Cadence Interval' }
    const recoveryStep = { type: 'Active', name: 'Standard Cadence Recovery' }

    expect(resolveCyclingCadence(highStep, parent, 0)).toBe(95)
    expect(resolveCyclingCadence(recoveryStep, parent, 1)).toBe(85)
  })

  it('keeps default cadence behavior when no cadence hint exists', () => {
    expect(resolveCyclingCadence({ type: 'Warmup', name: 'Warmup' })).toBe(85)
    expect(resolveCyclingCadence({ type: 'Rest', name: 'Recovery' })).toBe(80)
    expect(resolveCyclingCadence({ type: 'Active', name: 'Steady Endurance' })).toBe(90)
  })
})

describe('enforceCyclingCadenceVariation', () => {
  it('fixes uniform active cadence when variation intent exists', () => {
    const structure: any = {
      description: 'Cadence variation block with neuromuscular focus.',
      steps: [
        {
          type: 'Active',
          name: 'Neuromuscular Focus (5x5min @ 95+ RPM)',
          targetSplit: 'Vary Cadence 95/85 RPM',
          cadence: 90,
          steps: [
            {
              type: 'Active',
              name: 'High Cadence Interval',
              cadence: 90,
              durationSeconds: 300
            },
            {
              type: 'Active',
              name: 'Standard Cadence Recovery',
              cadence: 90,
              durationSeconds: 300
            }
          ]
        }
      ]
    }

    const changed = enforceCyclingCadenceVariation(structure)

    expect(changed).toBe(true)
    expect(structure.steps[0].steps[0].cadence).toBe(95)
    expect(structure.steps[0].steps[1].cadence).toBe(85)
  })

  it('does not modify cadence when there is no variation intent', () => {
    const structure: any = {
      description: 'Steady aerobic endurance ride.',
      steps: [
        { type: 'Active', name: 'Steady Block 1', cadence: 90, durationSeconds: 600 },
        { type: 'Active', name: 'Steady Block 2', cadence: 90, durationSeconds: 600 }
      ]
    }

    const changed = enforceCyclingCadenceVariation(structure)

    expect(changed).toBe(false)
    expect(structure.steps[0].cadence).toBe(90)
    expect(structure.steps[1].cadence).toBe(90)
  })
})
