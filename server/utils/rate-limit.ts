type RateLimitEntry = {
  count: number
  windowStartedAt: number
  lastAttemptAt: number
}

export type RateLimitOptions = {
  windowMs: number
  maxAttempts: number
  minIntervalMs?: number
}

const stores = new Map<string, Map<string, RateLimitEntry>>()

function getStore(namespace: string) {
  let store = stores.get(namespace)
  if (!store) {
    store = new Map()
    stores.set(namespace, store)
  }
  return store
}

export function checkRateLimit(
  namespace: string,
  key: string,
  options: RateLimitOptions,
  now = Date.now()
): { allowed: true } | { allowed: false; retryAfterMs: number } {
  const store = getStore(namespace)
  const currentEntry = store.get(key)

  if (!currentEntry || now - currentEntry.windowStartedAt > options.windowMs) {
    store.set(key, {
      count: 1,
      windowStartedAt: now,
      lastAttemptAt: now
    })
    return { allowed: true }
  }

  if (options.minIntervalMs && now - currentEntry.lastAttemptAt < options.minIntervalMs) {
    return {
      allowed: false,
      retryAfterMs: options.minIntervalMs - (now - currentEntry.lastAttemptAt)
    }
  }

  if (currentEntry.count >= options.maxAttempts) {
    return {
      allowed: false,
      retryAfterMs: options.windowMs - (now - currentEntry.windowStartedAt)
    }
  }

  currentEntry.count += 1
  currentEntry.lastAttemptAt = now
  store.set(key, currentEntry)
  return { allowed: true }
}

export function getRateLimitKeyFromEvent(event: { headers?: Record<string, string | undefined> }) {
  const forwardedFor = event.headers?.['x-forwarded-for']
  return forwardedFor?.split(',')[0]?.trim() || 'unknown'
}
