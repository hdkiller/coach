export type ReferralShareMedium = 'mobile_qr' | 'web_share' | 'link'

const REFERRAL_CODE_PATTERN = /^[A-Z2-9]{6,16}$/

export function normalizeReferralCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const code = raw.trim().toUpperCase()
  if (!code || !REFERRAL_CODE_PATTERN.test(code)) return null
  return code
}

export function normalizeReferralSource(raw: unknown): ReferralShareMedium {
  if (raw === 'mobile_qr' || raw === 'web_share' || raw === 'link') return raw
  if (typeof raw === 'string') {
    const medium = raw.trim().toLowerCase()
    if (medium === 'mobile_qr' || medium === 'web_share') return medium
  }
  return 'link'
}

export function siteOriginFromEnv(envSiteUrl?: string | null): string {
  return (envSiteUrl || 'https://coachwatts.com').replace(/\/$/, '')
}

export function buildReferralShareUrl(
  code: string,
  medium: ReferralShareMedium = 'link',
  siteUrl?: string | null
): string {
  const url = new URL('/join', `${siteOriginFromEnv(siteUrl)}/`)
  url.searchParams.set('via', code.toUpperCase())
  url.searchParams.set('utm_source', 'in_app_share')
  url.searchParams.set('utm_medium', medium)
  url.searchParams.set('utm_campaign', 'athlete_referral')
  return url.toString()
}
