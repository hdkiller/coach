import { describe, expect, it } from 'vitest'
import {
  normalizeStructuredWorkoutForPersistence,
  computeStructuredWorkoutDurationSec,
  computeStructuredWorkoutMetrics,
  toIntensityFactorFromTarget
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

  it('computes duration for grouped strength exercises', () => {
    const durationSec = computeStructuredWorkoutDurationSec({
      exercises: [
        {
          name: 'Back Squat',
          group: 'Main Lifts',
          sets: 4,
          reps: '5',
          rest: '2m'
        },
        {
          name: 'Split Squat',
          group: 'Accessories',
          sets: 3,
          reps: '8',
          rest: '90s'
        }
      ]
    })

    expect(durationSec).toBe(970)
  })

  it('computes fallback tss and work intensity for strength exercises', () => {
    const metrics = computeStructuredWorkoutMetrics(
      {
        exercises: [
          {
            name: 'Deadlift',
            group: 'Main Lifts',
            sets: 5,
            reps: '3',
            rest: '3m'
          }
        ]
      },
      {
        refs,
        fallbackOrder: ['power', 'heartRate', 'pace', 'rpe'],
        workoutType: 'WeightTraining'
      }
    )

    expect(metrics.durationSec).toBe(975)
    expect(metrics.tss).toBe(11)
    expect(metrics.workIntensity).toBeCloseTo(0.64, 2)
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

  it('maps running pace zones to configured pace-zone bounds', () => {
    const intensity = toIntensityFactorFromTarget({ value: 1, units: 'pace_zone' }, 'pace', {
      ...refs,
      thresholdPace: 4,
      paceZones: [
        { min: 0, max: 3.2 },
        { min: 3.21, max: 3.56 },
        { min: 3.57, max: 3.8 }
      ]
    })

    expect(intensity).toBeCloseTo(0.4)
  })

  it('normalizes %pace units correctly', () => {
    const intensity = toIntensityFactorFromTarget({ value: 93, units: '%pace' }, 'pace', {
      ...refs,
      thresholdPace: 4.329
    })

    expect(intensity).toBeCloseTo(0.93)
  })

  it('preserves warmup and cooldown ranges as ramps during persistence normalization', () => {
    const normalized = normalizeStructuredWorkoutForPersistence(
      {
        steps: [
          {
            type: 'Warmup',
            durationSeconds: 600,
            primaryTarget: 'power',
            power: { range: { start: 0.5, end: 0.7 }, units: '%' }
          },
          {
            type: 'Cooldown',
            durationSeconds: 300,
            primaryTarget: 'power',
            power: { range: { start: 0.6, end: 0.45 }, units: '%' }
          }
        ]
      },
      {
        refs,
        workoutType: 'Ride',
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

    expect(normalized.steps[0].power.ramp).toBe(true)
    expect(normalized.steps[1].power.ramp).toBe(true)
  })

  it('keeps recovery ranges flat instead of inferring ramps', () => {
    const normalized = normalizeStructuredWorkoutForPersistence(
      {
        steps: [
          {
            type: 'Rest',
            durationSeconds: 180,
            primaryTarget: 'power',
            power: { range: { start: 0.5, end: 0.6 }, units: '%' }
          }
        ]
      },
      {
        refs,
        workoutType: 'Ride',
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

    expect(normalized.steps[0].power.ramp).toBe(false)
  })
})
