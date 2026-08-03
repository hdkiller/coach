import { describe, expect, it } from 'vitest'

import {
  normalizeStripeRedirectUrl,
  resolveStripeRedirectUrl,
  StripeRedirectUrlError
} from '../../../../../server/utils/stripe-redirect-url'

const SITE = 'https://app.coachwatts.com'

describe('stripe-redirect-url', () => {
  describe('normalizeStripeRedirectUrl', () => {
    it('accepts same-origin absolute URLs', () => {
      expect(normalizeStripeRedirectUrl(`${SITE}/settings/billing?success=true`, SITE)).toBe(
        `${SITE}/settings/billing?success=true`
      )
    })

    it('resolves relative paths against siteUrl', () => {
      expect(normalizeStripeRedirectUrl('/settings/billing?canceled=true', SITE)).toBe(
        `${SITE}/settings/billing?canceled=true`
      )
    })

    it('strips fragments', () => {
      expect(normalizeStripeRedirectUrl(`${SITE}/billing#section`, SITE)).toBe(`${SITE}/billing`)
    })

    it('rejects cross-origin absolute URLs', () => {
      expect(() => normalizeStripeRedirectUrl('https://evil.example/phish', SITE)).toThrow(
        StripeRedirectUrlError
      )
      try {
        normalizeStripeRedirectUrl('https://evil.example/phish', SITE)
      } catch (error: any) {
        expect(error.statusCode).toBe(400)
        expect(error.message).toMatch(/same-origin/i)
      }
    })

    it('rejects protocol-relative URLs', () => {
      expect(() => normalizeStripeRedirectUrl('//evil.example/phish', SITE)).toThrow(
        StripeRedirectUrlError
      )
    })

    it('rejects non-http schemes', () => {
      expect(() => normalizeStripeRedirectUrl('javascript:alert(1)', SITE)).toThrow(
        StripeRedirectUrlError
      )
    })

    it('rejects path traversal segments', () => {
      expect(() => normalizeStripeRedirectUrl('/ok/../evil', SITE)).toThrow(StripeRedirectUrlError)
    })

    it('rejects URLs with credentials', () => {
      expect(() =>
        normalizeStripeRedirectUrl(`https://user:pass@app.coachwatts.com/billing`, SITE)
      ).toThrow(StripeRedirectUrlError)
    })

    it('accepts an explicit allowlist origin', () => {
      expect(
        normalizeStripeRedirectUrl('https://preview.example/billing', SITE, {
          allowedOrigins: ['https://preview.example']
        })
      ).toBe('https://preview.example/billing')
    })
  })

  describe('resolveStripeRedirectUrl', () => {
    it('uses the fallback path when omitted', () => {
      expect(resolveStripeRedirectUrl(undefined, SITE, '/settings/billing')).toBe(
        `${SITE}/settings/billing`
      )
      expect(resolveStripeRedirectUrl(null, SITE, '/settings/billing?success=true')).toBe(
        `${SITE}/settings/billing?success=true`
      )
      expect(resolveStripeRedirectUrl('   ', SITE, '/settings/billing')).toBe(
        `${SITE}/settings/billing`
      )
    })

    it('normalizes a provided same-origin URL', () => {
      expect(
        resolveStripeRedirectUrl(`${SITE}/pricing?canceled=true`, SITE, '/settings/billing')
      ).toBe(`${SITE}/pricing?canceled=true`)
    })
  })
})
