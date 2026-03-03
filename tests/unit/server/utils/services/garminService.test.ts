import { describe, expect, it } from 'vitest'
import { GarminService } from '../../../../../server/utils/services/garminService'

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
