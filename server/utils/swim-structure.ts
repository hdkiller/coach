type SwimStepLike = {
  name?: string
  text?: string
  description?: string
  distance?: number
  duration?: number
  durationSeconds?: number
  reps?: number
  steps?: SwimStepLike[]
}

const SWIM_DISTANCE_TOKEN_RE = /\b(\d+(?:\.\d+)?)\s*(km|mtr|mtrs|m)\b/i

function toDistanceMeters(rawValue: string, rawUnit: string) {
  const value = Number.parseFloat(rawValue)
  if (!Number.isFinite(value) || value <= 0) return null
  const normalizedUnit = rawUnit.toLowerCase()
  if (normalizedUnit === 'km') return Math.round(value * 1000)
  if (normalizedUnit === 'mtr' || normalizedUnit === 'mtrs') return Math.round(value)
  if (normalizedUnit === 'm') {
    // In swim text, bare "m" is ambiguous. Treat it as distance only for realistic pool lengths.
    if (value >= 25) return Math.round(value)
    return null
  }
  return null
}

function cleanLabel(text: string) {
  return text.replace(/\s{2,}/g, ' ').trim()
}

export function extractSwimDistanceFromText(text?: string | null) {
  if (!text) return null
  const match = text.match(SWIM_DISTANCE_TOKEN_RE)
  if (!match) return null

  const distance = toDistanceMeters(match[1] || '', match[2] || '')
  if (!distance) return null

  return {
    distance,
    strippedText: cleanLabel(text.replace(match[0], ' '))
  }
}

export function normalizeSwimStep(step: SwimStepLike): SwimStepLike {
  if (!step || typeof step !== 'object') return step

  if (Array.isArray(step.steps) && step.steps.length > 0) {
    step.steps.forEach((child) => normalizeSwimStep(child))

    const reps = Number(step.reps) || 1
    const nestedDistance = step.steps.reduce((sum, child) => {
      const childDistance = Number(child?.distance) || 0
      return sum + childDistance
    }, 0)
    if ((!Number(step.distance) || Number(step.distance) <= 0) && nestedDistance > 0) {
      step.distance = nestedDistance * reps
    }
    return step
  }

  const labelFields: Array<'name' | 'text' | 'description'> = ['name', 'text', 'description']
  let extractedDistance: number | null = null

  for (const field of labelFields) {
    const value = step[field]
    if (typeof value !== 'string' || value.trim().length === 0) continue
    const extracted = extractSwimDistanceFromText(value)
    if (!extracted) continue

    if (!extractedDistance) extractedDistance = extracted.distance
    if ((!Number(step.distance) || Number(step.distance) <= 0) && extractedDistance > 0) {
      step.distance = extractedDistance
    }
    step[field] = extracted.strippedText || undefined
  }

  if (step.distance !== undefined) {
    const numericDistance = Number(step.distance)
    step.distance = Number.isFinite(numericDistance) && numericDistance > 0 ? numericDistance : 0
  }

  return step
}

export function normalizeSwimStructure<T extends { steps?: SwimStepLike[] } | null | undefined>(
  structuredWorkout: T
) {
  if (!structuredWorkout || !Array.isArray(structuredWorkout.steps)) return structuredWorkout
  structuredWorkout.steps.forEach((step) => normalizeSwimStep(step))
  return structuredWorkout
}

export function getSwimStructureStats(
  structuredWorkout: { steps?: SwimStepLike[] } | null | undefined
) {
  let leafDistanceSteps = 0
  let totalLeafDistance = 0
  let maxLeafDurationWithoutDistance = 0

  const visit = (steps?: SwimStepLike[]) => {
    for (const step of steps || []) {
      if (Array.isArray(step.steps) && step.steps.length > 0) {
        visit(step.steps)
        continue
      }

      const distance = Number(step.distance) || 0
      const duration = Number(step.durationSeconds || step.duration) || 0

      if (distance > 0) {
        leafDistanceSteps += 1
        totalLeafDistance += distance
      } else if (duration > maxLeafDurationWithoutDistance) {
        maxLeafDurationWithoutDistance = duration
      }
    }
  }

  visit(structuredWorkout?.steps)

  return {
    leafDistanceSteps,
    totalLeafDistance,
    maxLeafDurationWithoutDistance
  }
}

export function shouldReparseSwimDescription(
  structuredWorkout: { steps?: SwimStepLike[] } | null | undefined,
  description?: string | null
) {
  if (!description || !SWIM_DISTANCE_TOKEN_RE.test(description)) return false

  const stats = getSwimStructureStats(structuredWorkout)
  return stats.leafDistanceSteps === 0 || stats.maxLeafDurationWithoutDistance >= 60 * 60
}
