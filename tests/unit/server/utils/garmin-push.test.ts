import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildGarminCoursePayload,
  buildGarminTrainingPayload,
  mapCourseActivityToGarmin,
  countGarminWorkoutSteps,
  countStepsInGarminWorkoutResponse,
  createGarminWorkout,
  createGarminWorkoutSchedule,
  extractGarminScheduleId,
  toGarminOwnerId,
  toGarminWorkoutId,
  toGarminWorkoutSourceId
} from '../../../../server/utils/garmin-push'

const { ensureValidGarminToken } = vi.hoisted(() => ({
  ensureValidGarminToken: vi.fn()
}))

vi.mock('../../../../server/utils/garmin', () => ({
  ensureValidGarminToken
}))

beforeEach(() => {
  ensureValidGarminToken.mockReset()
  vi.restoreAllMocks()
})

describe('garmin push helpers', () => {
  it('uses the latest token for workout and schedule calls made with the same expired object', async () => {
    const expiredIntegration = {
      id: 'integration-training-expired',
      accessToken: 'expired-token',
      refreshToken: 'old-refresh-token',
      expiresAt: new Date(Date.now() - 1000)
    } as any
    const refreshedIntegration = {
      ...expiredIntegration,
      accessToken: 'fresh-token',
      refreshToken: 'fresh-refresh-token',
      expiresAt: new Date(Date.now() + 86_400_000)
    }
    ensureValidGarminToken.mockResolvedValue(refreshedIntegration)

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workoutId: 123,
          segments: [{ steps: [{ type: 'WorkoutStep' }] }]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ scheduleId: 456 })
      })
    vi.stubGlobal('fetch', fetchMock as any)

    await createGarminWorkout(expiredIntegration, { workoutName: 'Intervals' })
    await createGarminWorkoutSchedule(expiredIntegration, {
      workoutId: 123,
      date: '2026-07-23'
    })

    expect(ensureValidGarminToken).toHaveBeenCalledTimes(2)
    expect(ensureValidGarminToken).toHaveBeenNthCalledWith(1, expiredIntegration)
    expect(ensureValidGarminToken).toHaveBeenNthCalledWith(2, expiredIntegration)
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: 'Bearer fresh-token'
    })
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toMatchObject({
      Authorization: 'Bearer fresh-token'
    })
  })

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

  it('derives a unique workoutSourceId from the planned workout id', () => {
    const plannedId = 'aa09f554-5c2c-402e-b181-3fc6440320c4'
    expect(toGarminWorkoutSourceId(plannedId)).toBe('aa09f5545c2c402eb181')
    expect(toGarminWorkoutSourceId(plannedId).length).toBeLessThanOrEqual(20)
    expect(toGarminWorkoutSourceId('')).toBe('COACH_WATTZ')

    const fromWorkout = buildGarminTrainingPayload({
      id: plannedId,
      title: 'Source Id',
      type: 'Ride',
      steps: [{ type: 'Active', durationSeconds: 60 }]
    })
    expect(fromWorkout.workoutSourceId).toBe('aa09f5545c2c402eb181')

    const fromOptions = buildGarminTrainingPayload(
      {
        title: 'Source Id',
        type: 'Ride',
        steps: [{ type: 'Active', durationSeconds: 60 }]
      },
      {},
      { sourceId: plannedId }
    )
    expect(fromOptions.workoutSourceId).toBe('aa09f5545c2c402eb181')
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
      secondaryTargetValueLow: 95,
      secondaryTargetValueHigh: 95
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
    expect(toGarminWorkoutId('1633580475')).toBe(1633580475)
  })

  it('builds Tempo Power Builder ride steps with repeat + power targets', () => {
    const payload = buildGarminTrainingPayload(
      {
        title: 'Tempo Power Builder',
        type: 'Ride',
        durationSec: 5400,
        steps: [
          {
            name: 'Progressive Warmup',
            type: 'Warmup',
            power: { range: { end: 0.6, start: 0.5 }, units: '%ftp' },
            cadence: 85,
            durationSeconds: 1200
          },
          {
            name: '3x',
            reps: 3,
            type: 'Active',
            distance: 0,
            steps: [
              {
                name: 'Tempo Effort',
                type: 'Active',
                power: { range: { end: 0.88, start: 0.8 }, units: '%ftp' },
                cadence: 90,
                durationSeconds: 900
              }
            ]
          },
          {
            name: 'Sweet Spot Interval',
            type: 'Active',
            power: { range: { end: 0.94, start: 0.9 }, units: '%ftp' },
            cadence: 85,
            durationSeconds: 900
          },
          {
            name: 'Cooldown',
            type: 'Cooldown',
            power: { range: { end: 0.4, start: 0.5 }, units: '%ftp' },
            cadence: 80,
            durationSeconds: 600
          }
        ]
      },
      { ftp: 229 }
    )

    const steps = payload.segments[0]!.steps
    expect(steps).toHaveLength(4)
    expect(steps[0]).toMatchObject({
      type: 'WorkoutStep',
      intensity: 'WARMUP',
      durationType: 'TIME',
      durationValue: 1200,
      targetType: 'POWER',
      targetValueLow: 115,
      targetValueHigh: 137,
      secondaryTargetType: 'CADENCE',
      secondaryTargetValueLow: 85,
      secondaryTargetValueHigh: 85
    })
    expect(steps[1]).toMatchObject({
      type: 'WorkoutRepeatStep',
      repeatType: 'REPEAT_UNTIL_STEPS_CMPLT',
      repeatValue: 3
    })
    expect((steps[1] as any).steps[0]).toMatchObject({
      type: 'WorkoutStep',
      targetType: 'POWER',
      targetValueLow: 183,
      targetValueHigh: 202,
      secondaryTargetType: 'CADENCE',
      secondaryTargetValueLow: 90,
      secondaryTargetValueHigh: 90
    })
    expect(countGarminWorkoutSteps(steps)).toBe(4)
    expect(
      countStepsInGarminWorkoutResponse({
        workoutId: 1633580475,
        segments: payload.segments
      })
    ).toBe(4)
  })
  it('maps course activity types to Garmin course activity types correctly', () => {
    expect(mapCourseActivityToGarmin('TrailRun')).toBe('TRAIL_RUNNING')
    expect(mapCourseActivityToGarmin('trail_run')).toBe('TRAIL_RUNNING')
    expect(mapCourseActivityToGarmin('Trail')).toBe('TRAIL_RUNNING')
    expect(mapCourseActivityToGarmin('Run')).toBe('RUNNING')
    expect(mapCourseActivityToGarmin('road_run')).toBe('RUNNING')
    expect(mapCourseActivityToGarmin('Hike')).toBe('HIKING')
    expect(mapCourseActivityToGarmin('MountainBike')).toBe('MOUNTAIN_BIKING')
    expect(mapCourseActivityToGarmin('GravelRide')).toBe('GRAVEL_CYCLING')
    expect(mapCourseActivityToGarmin('Ride')).toBe('ROAD_CYCLING')
    expect(mapCourseActivityToGarmin('Unknown')).toBe('OTHER')
  })

  it('builds Garmin course payload with TRAIL_RUNNING activityType for trail run workouts', () => {
    const payload = buildGarminCoursePayload({
      title: 'Mountain Trail Run',
      type: 'TrailRun',
      distanceMeters: 10000,
      elevationGain: 500,
      elevationLoss: 480,
      geoPoints: [
        { lat: 45.0, lng: 6.0, elevation: 1000 },
        { lat: 45.1, lng: 6.1, elevation: 1500 }
      ]
    })

    expect(payload.activityType).toBe('TRAIL_RUNNING')
    expect(payload.courseName).toBe('Mountain Trail Run')
    expect(payload.distance).toBe(10000)
  })
})
