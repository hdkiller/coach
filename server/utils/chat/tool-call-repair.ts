type ToolNameRepair = {
  repairedName: string
  strategy: 'normalized' | 'edit-distance'
  distance?: number
}

function normalizeToolName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function boundedLevenshtein(a: string, b: string, maxDistance: number) {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > maxDistance) return Number.POSITIVE_INFINITY

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i]
    let rowMin = current[0]

    for (let j = 1; j <= b.length; j += 1) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1
      const value = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + substitutionCost
      )
      current.push(value)
      if (value < rowMin) rowMin = value
    }

    if (rowMin > maxDistance) {
      return Number.POSITIVE_INFINITY
    }

    previous = current
  }

  return previous[b.length] <= maxDistance ? previous[b.length] : Number.POSITIVE_INFINITY
}

export function findToolNameRepair(
  toolName: string,
  availableToolNames: string[]
): ToolNameRepair | null {
  if (!toolName || availableToolNames.includes(toolName)) {
    return null
  }

  const normalizedTarget = normalizeToolName(toolName)
  const normalizedMatches = availableToolNames.filter(
    (candidate) => normalizeToolName(candidate) === normalizedTarget
  )

  if (normalizedMatches.length === 1) {
    return {
      repairedName: normalizedMatches[0],
      strategy: 'normalized'
    }
  }

  const maxDistance = normalizedTarget.length >= 12 ? 2 : 1
  const ranked = availableToolNames
    .map((candidate) => ({
      candidate,
      distance: boundedLevenshtein(normalizedTarget, normalizeToolName(candidate), maxDistance)
    }))
    .filter((entry) => Number.isFinite(entry.distance))
    .sort((left, right) => left.distance - right.distance)

  if (ranked.length === 0) {
    return null
  }

  const [best, secondBest] = ranked
  if (!best || (secondBest && secondBest.distance === best.distance)) {
    return null
  }

  return {
    repairedName: best.candidate,
    strategy: 'edit-distance',
    distance: best.distance
  }
}
