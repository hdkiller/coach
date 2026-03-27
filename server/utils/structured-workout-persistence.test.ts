import { describe, expect, it } from 'vitest'
import {
  normalizeStructuredWorkoutForPersistence,
  computeStructuredWorkoutDurationSec,
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

  it('normalizes whole-percent LTHR ranges from compact drafts into decimal fractions', () => {
    const normalized = normalizeStructuredWorkoutForPersistence(
      {
        steps: [
          {
            type: 'Warmup',
            intent: 'warmup',
            durationSeconds: 300,
            primaryTarget: 'heartRate',
            heartRate: { range: { start: 80, end: 85 }, units: 'LTHR' }
          },
          {
            type: 'Active',
            intent: 'threshold',
            durationSeconds: 360,
            primaryTarget: 'heartRate',
            heartRate: { range: { start: 94, end: 99 }, units: 'LTHR' }
          }
        ]
      },
      {
        refs,
        workoutType: 'Run',
        targetPolicy: {
          primaryMetric: 'heartRate',
          fallbackOrder: ['heartRate', 'power', 'pace', 'rpe'],
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

    expect(normalized.steps[0].heartRate.units).toBe('LTHR')
    expect(normalized.steps[0].heartRate.range.start).toBeCloseTo(0.8)
    expect(normalized.steps[0].heartRate.range.end).toBeCloseTo(0.85)
    expect(normalized.steps[1].heartRate.units).toBe('LTHR')
    expect(normalized.steps[1].heartRate.range.start).toBeCloseTo(0.94)
    expect(normalized.steps[1].heartRate.range.end).toBeCloseTo(0.99)
  })

  it('computes recursive duration for repeated nested steps', () => {
    const durationSec = computeStructuredWorkoutDurationSec({
      steps: [
        { type: 'Warmup', durationSeconds: 300 },
        {
          type: 'Active',
          reps: 4,
          steps: [
            { type: 'Active', durationSeconds: 60 },
            { type: 'Active', durationSeconds: 300 }
          ]
        },
        { type: 'Active', durationSeconds: 600 },
        { type: 'Cooldown', durationSeconds: 300 }
      ]
    })

    expect(durationSec).toBe(2640)
  })

  it('infers run duration from distance and pace target', () => {
    const metrics = computeStructuredWorkoutMetrics(
      {
        steps: [
          {
            type: 'Active',
            distance: 1000,
            primaryTarget: 'pace',
            pace: { value: 3.0, units: 'm/s' }
          }
        ]
      },
      {
        refs,
        fallbackOrder: ['pace', 'heartRate', 'power', 'rpe'],
        workoutType: 'Run'
      }
    )

    expect(metrics.durationSec).toBe(333)
    expect(metrics.distanceMeters).toBe(1000)
  })

  it('infers run distance from duration and pace target', () => {
    const metrics = computeStructuredWorkoutMetrics(
      {
        steps: [
          {
            type: 'Active',
            durationSeconds: 600,
            primaryTarget: 'pace',
            pace: { value: 3.0, units: 'm/s' }
          }
        ]
      },
      {
        refs,
        fallbackOrder: ['pace', 'heartRate', 'power', 'rpe'],
        workoutType: 'Run'
      }
    )

    expect(metrics.distanceMeters).toBe(1800)
  })

  it('infers swim duration from distance and target split', () => {
    const metrics = computeStructuredWorkoutMetrics(
      {
        steps: [
          {
            type: 'Active',
            distance: 100,
            stroke: 'Free',
            targetSplit: '2:00/100m',
            primaryTarget: 'pace',
            pace: { range: { start: 0.8, end: 0.85 }, units: 'Pace' }
          }
        ]
      },
      {
        refs,
        fallbackOrder: ['pace', 'heartRate', 'power', 'rpe'],
        workoutType: 'Swim'
      }
    )

    expect(metrics.durationSec).toBe(120)
    expect(metrics.distanceMeters).toBe(100)
  })

  it('uses configured power zone bounds instead of generic zone mapping', () => {
    const metrics = computeStructuredWorkoutMetrics(
      {
        steps: [
          {
            type: 'Active',
            durationSeconds: 600,
            primaryTarget: 'power',
            power: { value: 2, units: 'power_zone' }
          }
        ]
      },
      {
        refs,
        fallbackOrder: ['power', 'heartRate', 'pace', 'rpe'],
        workoutType: 'Ride'
      }
    )

    expect(metrics.workIntensity).toBe(0.65)
    expect(metrics.tss).toBe(7)
  })
})
