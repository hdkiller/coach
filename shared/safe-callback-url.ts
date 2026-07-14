export function sanitizeCallbackUrl(
  callbackUrl: string | undefined | null,
  fallback = '/dashboard'
): string {
  if (!callbackUrl) return fallback

  const trimmed = callbackUrl.trim()
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
