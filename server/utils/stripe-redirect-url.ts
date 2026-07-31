import { createError } from 'h3'

/**
 * Same-origin allowlist for Stripe Checkout / Billing Portal redirect URLs.
 *
 * Client-supplied success/cancel/return URLs must resolve to an origin equal to
 * `config.public.siteUrl` (or an explicit extra allowlist). Relative paths are
 * resolved against the site origin. Cross-origin and non-http(s) URLs are rejected.
 */

export class StripeRedirectUrlError extends Error {
  readonly statusCode = 400

  constructor(message = 'Invalid redirect URL') {
    super(message)
    this.name = 'StripeRedirectUrlError'
  }
}

export type StripeRedirectUrlOptions = {
  /** Additional absolute origins allowed beyond `siteUrl` (e.g. preview hosts). */
  allowedOrigins?: string[]
}

function siteBaseUrl(siteUrl: string): URL {
  const raw = (siteUrl || 'http://localhost:3099').trim() || 'http://localhost:3099'
  try {
    return new URL(raw)
  } catch {
    throw new StripeRedirectUrlError('Invalid site URL configuration')
  }
}

function allowedOriginSet(site: URL, options?: StripeRedirectUrlOptions): Set<string> {
  const origins = new Set<string>([site.origin])
  for (const entry of options?.allowedOrigins || []) {
    if (!entry) continue
    try {
      origins.add(new URL(entry).origin)
    } catch {
      throw new StripeRedirectUrlError('Invalid redirect allowlist origin')
    }
  }
  return origins
}

/**
 * Validate and normalize a client-supplied redirect URL to an absolute same-origin URL.
 */
export function normalizeStripeRedirectUrl(
  candidate: string,
  siteUrl: string,
  options?: StripeRedirectUrlOptions
): string {
  const trimmed = candidate.trim()
  if (!trimmed) {
    throw new StripeRedirectUrlError('Invalid redirect URL')
  }

  // Protocol-relative URLs (`//evil.example`) must not be treated as paths.
  if (trimmed.startsWith('//')) {
    throw new StripeRedirectUrlError('Invalid redirect URL')
  }

  const site = siteBaseUrl(siteUrl)
  const allowed = allowedOriginSet(site, options)

  let parsed: URL
  if (trimmed.startsWith('/')) {
    if (trimmed.split('/').some((segment) => segment === '..')) {
      throw new StripeRedirectUrlError('Invalid redirect URL')
    }
    parsed = new URL(trimmed, site)
  } else {
    try {
      parsed = new URL(trimmed)
    } catch {
      throw new StripeRedirectUrlError('Invalid redirect URL')
    }
  }

  if (parsed.username || parsed.password) {
    throw new StripeRedirectUrlError('Invalid redirect URL')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new StripeRedirectUrlError('Invalid redirect URL')
  }

  if (!allowed.has(parsed.origin)) {
    throw new StripeRedirectUrlError('Redirect URL must be same-origin')
  }

  // Fragments are never sent to the server and are useless for Stripe redirects.
  parsed.hash = ''
  return parsed.toString()
}

/**
 * Resolve an optional client redirect URL, falling back to a same-origin default path
 * when the candidate is omitted or blank.
 */
export function resolveStripeRedirectUrl(
  candidate: string | undefined | null,
  siteUrl: string,
  fallbackPath: string,
  options?: StripeRedirectUrlOptions
): string {
  if (candidate == null || String(candidate).trim() === '') {
    const path = fallbackPath.startsWith('/') ? fallbackPath : `/${fallbackPath}`
    return normalizeStripeRedirectUrl(path, siteUrl, options)
  }
  return normalizeStripeRedirectUrl(String(candidate), siteUrl, options)
}

/**
 * Same as {@link resolveStripeRedirectUrl}, but maps validation failures to HTTP 400.
 */
export function requireStripeRedirectUrl(
  candidate: string | undefined | null,
  siteUrl: string,
  fallbackPath: string,
  options?: StripeRedirectUrlOptions
): string {
  try {
    return resolveStripeRedirectUrl(candidate, siteUrl, fallbackPath, options)
  } catch (error) {
    if (error instanceof StripeRedirectUrlError) {
      throw createError({
        statusCode: 400,
        message: error.message
      })
    }
    throw error
  }
}
