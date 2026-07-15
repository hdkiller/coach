import type { LocationQueryValue } from 'vue-router'

type CallbackQueryValue =
  LocationQueryValue | LocationQueryValue[] | string | string[] | undefined | null

function normalizeCallbackParam(callbackUrl: CallbackQueryValue): string | undefined {
  if (Array.isArray(callbackUrl)) {
    const first = callbackUrl.find((value) => value != null)
    return first ?? undefined
  }

  return callbackUrl ?? undefined
}

export function sanitizeCallbackUrl(
  callbackUrl: CallbackQueryValue,
  fallback = '/dashboard'
): string {
  const raw = normalizeCallbackParam(callbackUrl)
  if (!raw) return fallback

  const trimmed = raw.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return fallback
  }

  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) {
    return fallback
  }

  if (trimmed.includes('\\')) {
    return fallback
  }

  return trimmed
}
