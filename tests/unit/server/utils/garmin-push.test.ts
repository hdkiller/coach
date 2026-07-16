import { describe, expect, it } from 'vitest'
import {
  buildGarminTrainingPayload,
  countGarminWorkoutSteps,
  extractGarminScheduleId,
  toGarminOwnerId
} from '../../../../server/utils/garmin-push'

describe('garmin push helpers', () => {
  it('builds a V2 segmented payload with absolute power as primary target', () => {
    const payload = buildGarminTrainingPayload(
      {
        title: 'Test Ride',
        type: 'Ride',
        steps: [
          {
            type: 'Active',
            durationSeconds: 600,
            power: { value: 0.95, units: '%' },
            heartRate: { value: 0.85, units: '%' }
          }
        ]
      },
      { ftp: 200, lthr: 150 }
    )

    expect(payload.sport).toBe('CYCLING')
    expect(payload.workoutProvider).toBe('COACH_WATTZ')
    expect(payload.workoutSourceId).toBe('COACH_WATTZ')
    expect(payload.isSessionTransitionEnabled).toBe(false)
    expect(payload.segments).toHaveLength(1)
    expect(payload.segments[0]).toMatchObject({
      segmentOrder: 1,
      sport: 'CYCLING'
    })

    const step = payload.segments[0]!.steps[0] as Record<string, unknown>
    expect(step.type).toBe('WorkoutStep')
    expect(step.targetType).toBe('POWER')
    expect(step.targetValue).toBe(190)
    expect(step.secondaryTargetType).toBe('HEART_RATE')
    expect(step.secondaryTargetValue).toBe(128)
    expect(payload).not.toHaveProperty('steps')
  })

  it('prefers pace as primary for running and maps trail run to RUNNING', () => {
    const payload = buildGarminTrainingPayload(
      {
        title: 'Tempo Run',
        type: 'TrailRun',
        steps: [
          {
            type: 'Active',
            distance: 1600,
            pace: { range: { start: 3.3, end: 3.5 }, units: 'm/s' },
            heartRate: { range: { start: 0.85, end: 0.9 }, units: '%' },
            cadence: 180
          }
        ]
      },
      { lthr: 160 }
    )

    expect(payload.sport).toBe('RUNNING')
    const step = payload.segments[0]!.steps[0] as Record<string, unknown>
    expect(step.durationType).toBe('DISTANCE')
    expect(step.durationValue).toBe(1600)
    expect(step.durationValueType).toBe('METER')
    expect(step.targetType).toBe('PACE')
    expect(step.targetValueLow).toBe(3.3)
    expect(step.targetValueHigh).toBe(3.5)
    // V2 docs only guarantee secondary targets for cycling/swim — omit for run.
    expect(step.secondaryTargetType).toBeUndefined()
  })

  it('preserves WorkoutRepeatStep instead of unrolling repeats', () => {
    const payload = buildGarminTrainingPayload(
      {
        title: 'Intervals',
        type: 'Ride',
        steps: [
          { type: 'Warmup', durationSeconds: 600, power: { value: 0.55, units: '%' } },
          {
            type: 'Repeat',
            reps: 4,
            steps: [
              {
                type: 'Interval',
                durationSeconds: 180,
                power: { range: { start: 1.05, end: 1.1 }, units: '%' },
                cadence: 95
              },
              { type: 'Recovery', durationSeconds: 120, power: { value: 0.5, units: '%' } }
            ]
          },
          { type: 'Cooldown', durationSeconds: 300, power: { value: 0.5, units: '%' } }
        ]
      },
      { ftp: 250 }
    )

    const steps = payload.segments[0]!.steps
    expect(steps).toHaveLength(3)
    expect(steps[0]).toMatchObject({
      type: 'WorkoutStep',
      stepOrder: 1,
      intensity: 'WARMUP'
    })
    expect(steps[1]).toMatchObject({
      type: 'WorkoutRepeatStep',
      stepOrder: 2,
      repeatType: 'REPEAT_UNTIL_STEPS_CMPLT',
      repeatValue: 4
    })
    const repeatChildren = (steps[1] as any).steps
    expect(repeatChildren).toHaveLength(2)
    expect(repeatChildren[0]).toMatchObject({
      type: 'WorkoutStep',
      stepOrder: 3,
      intensity: 'INTERVAL',
      targetType: 'POWER',
      secondaryTargetType: 'CADENCE',
      secondaryTargetValue: 95
    })
    expect(repeatChildren[1]).toMatchObject({
      type: 'WorkoutStep',
      stepOrder: 4,
      intensity: 'RECOVERY'
    })
    expect(steps[2]).toMatchObject({
      type: 'WorkoutStep',
      stepOrder: 5,
      intensity: 'COOLDOWN'
    })
    expect(countGarminWorkoutSteps(steps)).toBe(4)
  })

  it('wraps leaf steps with reps into WorkoutRepeatStep', () => {
    const payload = buildGarminTrainingPayload({
      title: 'Strides',
      type: 'Run',
      steps: [
        {
          type: 'Active',
          reps: 6,
          durationSeconds: 30,
          pace: { value: 4.5, units: 'm/s' }
        }
      ]
    })

    const step = payload.segments[0]!.steps[0] as Record<string, unknown>
    expect(step).toMatchObject({
      type: 'WorkoutRepeatStep',
      stepOrder: 1,
      repeatType: 'REPEAT_UNTIL_STEPS_CMPLT',
      repeatValue: 6
    })
    expect((step.steps as any[])[0]).toMatchObject({
      type: 'WorkoutStep',
      stepOrder: 2,
      targetType: 'PACE',
      targetValue: 4.5
    })
  })

  it('extracts schedule ids from Garmin API responses', () => {
    expect(extractGarminScheduleId({ scheduleId: 42 })).toBe('42')
    expect(extractGarminScheduleId({ id: 'abc' })).toBe('abc')
    expect(extractGarminScheduleId('123')).toBe('123')
    expect(extractGarminScheduleId({})).toBe('')
  })

  it('maps extended sport types to V2 enums', () => {
    const payload = buildGarminTrainingPayload({
      title: 'Virtual Ride',
      type: 'VirtualRide',
      steps: [{ type: 'Active', durationSeconds: 300 }]
    })

    expect(payload.sport).toBe('CYCLING')
    expect(payload.segments[0]!.sport).toBe('CYCLING')
  })

  it('includes numeric ownerId and rejects wellness UUID ownerIds', () => {
    const withNumeric = buildGarminTrainingPayload(
      {
        title: 'Owned',
        type: 'Ride',
        steps: [{ type: 'Active', durationSeconds: 60 }]
      },
      {},
      { ownerId: '998877' }
    )
    expect(withNumeric.ownerId).toBe(998877)

    const withUuid = buildGarminTrainingPayload(
      {
        title: 'Owned',
        type: 'Ride',
        steps: [{ type: 'Active', durationSeconds: 60 }]
      },
      {},
      { ownerId: '0db20509-029f-4a45-ada0-fc230913f3b3' }
    )
    expect(withUuid.ownerId).toBeUndefined()
    expect(toGarminOwnerId('0db20509-029f-4a45-ada0-fc230913f3b3')).toBeUndefined()
    expect(toGarminOwnerId('12345')).toBe(12345)
  })
})
