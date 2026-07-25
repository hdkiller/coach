import { describe, expect, it } from 'vitest'
import {
  buildReferralShareUrl,
  normalizeReferralCode,
  normalizeReferralSource
} from '../../../../shared/referrals'

describe('referral helpers', () => {
  it('normalizes opaque referral codes', () => {
    expect(normalizeReferralCode('ab23cd45ef')).toBe('AB23CD45EF')
    expect(normalizeReferralCode('bad code')).toBeNull()
    expect(normalizeReferralCode('')).toBeNull()
  })

  it('maps share mediums', () => {
    expect(normalizeReferralSource('mobile_qr')).toBe('mobile_qr')
    expect(normalizeReferralSource('web_share')).toBe('web_share')
    expect(normalizeReferralSource('dashboard_footer')).toBe('link')
  })

  it('builds join share URLs with via + UTMs', () => {
    const url = new URL(buildReferralShareUrl('ABCDEFGHJK', 'mobile_qr', 'https://coachwatts.com'))
    expect(url.pathname).toBe('/join')
    expect(url.searchParams.get('via')).toBe('ABCDEFGHJK')
    expect(url.searchParams.get('utm_source')).toBe('in_app_share')
    expect(url.searchParams.get('utm_medium')).toBe('mobile_qr')
    expect(url.searchParams.get('utm_campaign')).toBe('athlete_referral')
  })
})
