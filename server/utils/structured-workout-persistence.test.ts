import { describe, expect, it } from 'vitest'
import {
  normalizeStructuredWorkoutForPersistence,
  computeStructuredWorkoutMetrics
} from './structured-workout-persistence'

describe('structured workout persistence', () => {
  const refs = {
    ftp: 290,
    lthr: 168,
    maxHr: 185,
    thresholdPace: 2.345,
    hrZones: [],
    powerZones: [],
    paceZones: []
  }

  it('enforces strict primary for run steps during persistence normalization', () => {
    const normalized = normalizeStructuredWorkoutForPersistence(
      {
        steps: [
          {
            type: 'Active',
            durationSeconds: 300,
            primaryTarget: 'power',
            power: { range: { start: 108, end: 110 }, units: '%' },
            heartRate: { range: { start: 0.9, end: 0.92 }, units: 'LTHR' }
          }
        ]
      },
      {
        refs,
        workoutType: 'Run',
        targetPolicy: {
          primaryMetric: 'power',
          fallbackOrder: ['power', 'heartRate', 'pace', 'rpe'],
          strictPrimary: true,
          allowMixedTargetsPerStep: false,
          defaultTargetStyle: 'range',
          preferRangesForSteady: true
        },
        targetFormatPolicy: {
          heartRate: { mode: 'percentLthr', preferRange: true },
          power: { mode: 'percentFtp', preferRange: true },
          pace: { mode: 'percentPace', preferRange: true },
          cadence: { mode: 'rpm' }
        }
      }
    )

    expect(normalized.steps[0].primaryTarget).toBe('power')
    expect(normalized.steps[0].power).toMatchObject({
      range: { start: 1.08, end: 1.1 },
      units: '%'
    })
    expect(normalized.steps[0].heartRate).toBeUndefined()
  })

  it('computes metrics from the primary target before secondary guardrails', () => {
    const metrics = computeStructuredWorkoutMetrics(
      {
        steps: [
          {
            type: 'Active',
            durationSeconds: 600,
            primaryTarget: 'power',
            power: { value: 1.1, units: '%' },
            heartRate: { value: 0.6, units: 'LTHR' }
          }
        ]
      },
      {
        refs,
        fallbackOrder: ['heartRate', 'power', 'pace', 'rpe']
      }
    )

    expect(metrics.tss).toBe(20)
    expect(metrics.workIntensity).toBe(1.1)
  })
})
