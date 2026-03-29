import { describe, expect, it } from 'vitest'
import {
  extractGarminBodyBatteryScore,
  extractGarminReadinessScore,
  GarminService
} from '../../../../../server/utils/services/garminService'

describe('GarminService.extractPullToken', () => {
  it('prefers the webhook query token', () => {
    const token = GarminService.extractPullToken(
      { token: 'payload-token' },
      { query: { token: 'query-token' }, headers: { 'x-garmin-pull-token': 'header-token' } }
    )

    expect(token).toBe('query-token')
  })

  it('falls back to the payload token', () => {
    const token = GarminService.extractPullToken(
      { token: 'payload-token' },
      { query: {}, headers: {} }
    )

    expect(token).toBe('payload-token')
  })

  it('falls back to the header token and handles missing values', () => {
    expect(
      GarminService.extractPullToken({}, { query: {}, headers: { 'x-garmin-pull-token': 'abc' } })
    ).toBe('abc')

    expect(GarminService.extractPullToken({}, { query: {}, headers: {} })).toBeNull()
  })
})

describe('GarminService.getActivityFileExternalIds', () => {
  it('matches activity file records back to garmin workout external ids', () => {
    expect(
      GarminService.getActivityFileExternalIds({
        activityId: 22047215050,
        summaryId: '22047215050-file'
      })
    ).toEqual(['22047215050', '22047215050-file'])
  })

  it('handles sparse records', () => {
    expect(GarminService.getActivityFileExternalIds({ summaryId: 'abc-file' })).toEqual([
      'abc-file',
      'abc'
    ])
    expect(GarminService.getActivityFileExternalIds({})).toEqual([])
  })
})

describe('GarminService.resolveWellnessDate', () => {
  it('prefers Garmin calendarDate for date-only wellness records', () => {
    const date = GarminService.resolveWellnessDate({
      calendarDate: '2026-03-10',
      startTimeInSeconds: 1773097200
    })

    expect(date?.toISOString()).toBe('2026-03-10T00:00:00.000Z')
  })

  it('uses Garmin startTimeOffsetInSeconds to keep the user local day', () => {
    const date = GarminService.resolveWellnessDate(
      {
        startTimeInSeconds: Date.parse('2026-03-09T23:00:00.000Z') / 1000,
        startTimeOffsetInSeconds: 3600
      },
      {
        timestampField: 'startTimeInSeconds',
        offsetField: 'startTimeOffsetInSeconds'
      }
    )

    expect(date?.toISOString()).toBe('2026-03-10T00:00:00.000Z')
  })

  it('falls back to UTC timestamp normalization when no offset is provided', () => {
    const date = GarminService.resolveWellnessDate(
      {
        startTimeInSeconds: Date.parse('2026-03-10T04:30:00.000Z') / 1000
      },
      {
        timestampField: 'startTimeInSeconds',
        offsetField: 'startTimeOffsetInSeconds'
      }
    )

    expect(date?.toISOString()).toBe('2026-03-10T00:00:00.000Z')
  })
})

describe('extractGarminBodyBatteryScore', () => {
  it('prefers the most recent body battery value when available', () => {
    expect(
      extractGarminBodyBatteryScore({
        bodyBatteryMostRecentValue: 68,
        bodyBatteryHighestValue: 92
      })
    ).toBe(68)
  })

  it('falls back to the highest body battery value when that is all Garmin provides', () => {
    expect(
      extractGarminBodyBatteryScore({
        bodyBatteryHighestValue: 81
      })
    ).toBe(81)
  })

  it('clamps out-of-range values into the app recovery score range', () => {
    expect(
      extractGarminBodyBatteryScore({
        bodyBatteryCurrentValue: 123
      })
    ).toBe(100)
  })

  it('returns null when the Garmin daily record has no body battery fields', () => {
    expect(
      extractGarminBodyBatteryScore({
        averageStressLevel: 37
      })
    ).toBeNull()
  })

  it('falls back to Garmin readiness-style scores when body battery is not available', () => {
    expect(
      extractGarminBodyBatteryScore({
        trainingReadinessScore: 74
      })
    ).toBe(74)
  })
})

describe('extractGarminReadinessScore', () => {
  it('normalizes Garmin training readiness scores into the app readiness scale', () => {
    expect(
      extractGarminReadinessScore({
        trainingReadinessScore: 74
      })
    ).toBe(7)
  })

  it('supports nested Garmin score payloads', () => {
    expect(
      extractGarminReadinessScore({
        trainingReadiness: { value: 83 }
      })
    ).toBe(8)
  })

  it('returns null when Garmin does not include a readiness metric', () => {
    expect(
      extractGarminReadinessScore({
        bodyBatteryMostRecentValue: 68
      })
    ).toBeNull()
  })
})
