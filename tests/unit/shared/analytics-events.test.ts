import { describe, expect, it } from 'vitest'
import { buildAcquisitionContext, sanitizeAnalyticsParams } from '../../../shared/analytics-events'

describe('buildAcquisitionContext', () => {
  it('maps join query params into analytics context', () => {
    expect(
      buildAcquisitionContext(
        {
          ref: 'hall-of-fame',
          via: 'ab23cd45ef',
          utm_source: 'newsletter',
          utm_medium: 'email',
          utm_campaign: 'launch'
        },
        'join'
      )
    ).toEqual({
      entry_point: 'join',
      referral_type: 'hall-of-fame',
      referral_code: 'AB23CD45EF',
      utm_source: 'newsletter',
      utm_medium: 'email',
      utm_campaign: 'launch'
    })
  })
})

describe('sanitizeAnalyticsParams', () => {
  it('removes empty analytics values', () => {
    expect(
      sanitizeAnalyticsParams({
        method: 'google',
        entry_point: 'join',
        utm_source: '',
        utm_campaign: undefined,
        utm_medium: null
      })
    ).toEqual({
      method: 'google',
      entry_point: 'join'
    })
  })
})
