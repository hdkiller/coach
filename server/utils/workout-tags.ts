const ICU_TAG_PREFIX = 'icu:'

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export function normalizeTagValue(tag: string): string | null {
  const normalized = normalizeWhitespace(tag).toLowerCase()
  return normalized ? normalized : null
}

export function toIntervalsTag(tag: string): string | null {
  const normalized = normalizeTagValue(tag)
  if (!normalized) return null

  if (normalized.startsWith(ICU_TAG_PREFIX)) {
    const withoutPrefix = normalizeTagValue(normalized.slice(ICU_TAG_PREFIX.length))
    return withoutPrefix ? `${ICU_TAG_PREFIX}${withoutPrefix}` : null
  }

  return `${ICU_TAG_PREFIX}${normalized}`
}

export function toLocalTag(tag: string): string | null {
  const normalized = normalizeTagValue(tag)
  if (!normalized || normalized.startsWith(ICU_TAG_PREFIX)) return null
  return normalized
}

export function normalizeTagList(tags: unknown, mode: 'local' | 'intervals' | 'mixed' = 'mixed') {
  if (!Array.isArray(tags)) return []

  const normalized = tags
    .map((tag) => {
      if (typeof tag !== 'string') return null
      if (mode === 'local') return toLocalTag(tag)
      if (mode === 'intervals') return toIntervalsTag(tag)

      const cleaned = normalizeTagValue(tag)
      if (!cleaned) return null
      return cleaned.startsWith(ICU_TAG_PREFIX) ? toIntervalsTag(cleaned) : cleaned
    })
    .filter((tag): tag is string => !!tag)

  return Array.from(new Set(normalized)).sort()
}

export function mergeWorkoutTags(
  currentTags: string[] | null | undefined,
  options: {
    incomingIntervalsTags?: unknown
    addLocalTags?: unknown
    removeTags?: unknown
    setLocalTags?: unknown
  }
) {
  const existing = normalizeTagList(currentTags || [], 'mixed')
  let localTags = existing.filter((tag) => !tag.startsWith(ICU_TAG_PREFIX))
  let intervalsTags = existing.filter((tag) => tag.startsWith(ICU_TAG_PREFIX))

  if (options.incomingIntervalsTags !== undefined) {
    intervalsTags = normalizeTagList(options.incomingIntervalsTags, 'intervals')
  }

  if (options.setLocalTags !== undefined) {
    localTags = normalizeTagList(options.setLocalTags, 'local')
  }

  if (options.addLocalTags !== undefined) {
    localTags = normalizeTagList(
      [...localTags, ...normalizeTagList(options.addLocalTags, 'local')],
      'local'
    )
  }

  if (options.removeTags !== undefined) {
    const removals = new Set(normalizeTagList(options.removeTags, 'mixed'))
    localTags = localTags.filter((tag) => !removals.has(tag))
    intervalsTags = intervalsTags.filter((tag) => !removals.has(tag))
  }

  return Array.from(new Set([...localTags, ...intervalsTags])).sort()
}

export function parseTagQueryParam(value: unknown) {
  if (Array.isArray(value)) {
    return normalizeTagList(
      value.flatMap((entry) => (typeof entry === 'string' ? entry.split(',') : [])),
      'mixed'
    )
  }

  if (typeof value !== 'string' || !value.trim()) return []

  return normalizeTagList(value.split(','), 'mixed')
}

export function splitWorkoutTags(tags: string[] | null | undefined) {
  const normalized = normalizeTagList(tags || [], 'mixed')
  return {
    all: normalized,
    local: normalized.filter((tag) => !tag.startsWith(ICU_TAG_PREFIX)),
    intervals: normalized.filter((tag) => tag.startsWith(ICU_TAG_PREFIX))
  }
}

export function hasProtectedIntervalsTags(tags: unknown) {
  return normalizeTagList(tags as string[], 'mixed').some((tag) => tag.startsWith(ICU_TAG_PREFIX))
}
