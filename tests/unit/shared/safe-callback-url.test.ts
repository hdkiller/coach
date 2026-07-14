import { describe, expect, it } from 'vitest'
import { sanitizeCallbackUrl } from '../../../shared/safe-callback-url'

describe('sanitizeCallbackUrl', () => {
  it('allows internal partner return paths', () => {
    expect(sanitizeCallbackUrl('/partners/skool4cyclists?redeem=1')).toBe(
      '/partners/skool4cyclists?redeem=1'
    )
  })

  it('rejects protocol-relative and absolute URLs', () => {
    expect(sanitizeCallbackUrl('//evil.example/phish')).toBe('/dashboard')
    expect(sanitizeCallbackUrl('https://evil.example/phish')).toBe('/dashboard')
  })

  it('falls back when callback is missing', () => {
    expect(sanitizeCallbackUrl(undefined)).toBe('/dashboard')
  })
})
