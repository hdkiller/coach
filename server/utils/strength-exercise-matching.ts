import { generateStructuredAnalysis } from './gemini'
import { normalizeStrengthSetRows } from './strength-exercise-library'

const SAFE_ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\bdb\b/g, 'dumbbell'],
  [/\bbb\b/g, 'barbell'],
  [/\bbw\b/g, 'bodyweight']
]

const LOADED_LIFT_KEYWORDS = [
  'squat',
  'deadlift',
  'press',
  'row',
  'lunge',
  'split squat',
  'curl',
  'extension',
  'pull up',
  'chin up',
  'thruster'
]

const TIME_BASED_KEYWORDS = [
  'plank',
  'hold',
  'carry',
  'foam roll',
  'mobility',
  'stretch',
  'breathing',
  'warmup',
  'warm up',
  'cooldown',
  'cool down'
]

const MATCH_CONFIDENCE_THRESHOLD = 0.8
const MAX_LLM_CANDIDATES = 5

function normalizeText(value: unknown) {
  return String(value || '').trim()
}

function normalizeOptionalString(value: unknown) {
  const normalized = normalizeText(value)
  return normalized || undefined
}

function normalizeArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((entry) => normalizeText(entry)).filter(Boolean))]
}

export function normalizeExerciseMatchKey(value: unknown) {
  let normalized = normalizeText(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')

  for (const [pattern, replacement] of SAFE_ABBREVIATIONS) {
    normalized = normalized.replace(pattern, replacement)
  }

  return normalized.replace(/\s+/g, ' ').trim()
}

function tokenizeMatchKey(value: unknown) {
  return normalizeExerciseMatchKey(value).split(' ').filter(Boolean)
}

function isTimeBasedExerciseName(name: unknown) {
  const normalized = normalizeExerciseMatchKey(name)
  return TIME_BASED_KEYWORDS.some((keyword) => normalized.includes(keyword))
}

function isLoadedLiftName(name: unknown) {
  const normalized = normalizeExerciseMatchKey(name)
  return LOADED_LIFT_KEYWORDS.some((keyword) => normalized.includes(keyword))
}

function getStepRows(step: any) {
  return Array.isArray(step?.setRows) ? step.setRows : []
}

function hasMeaningfulSetRows(step: any) {
  return getStepRows(step).some((row: any) =>
    [row?.value, row?.loadValue, row?.restOverride].some((value) => normalizeText(value))
  )
}

function getDurationSecondsFromStep(step: any) {
  if (String(step?.prescriptionMode || '').trim() !== 'duration') return 0
  const firstValue = Number(getStepRows(step)[0]?.value || 0)
  return Number.isFinite(firstValue) ? firstValue : 0
}

function isWeakStrengthStep(step: any) {
  const setRows = getStepRows(step)
  if (!setRows.length || !hasMeaningfulSetRows(step)) return true

  if (
    String(step?.prescriptionMode || '').trim() === 'duration' &&
    isLoadedLiftName(step?.name) &&
    !isTimeBasedExerciseName(step?.name)
  ) {
    return true
  }

  if (
    setRows.length <= 1 &&
    getDurationSecondsFromStep(step) >= 300 &&
    isLoadedLiftName(step?.name)
  ) {
    return true
  }

  return false
}

export function validateStrengthStructuredWorkout(rawStructure: any, normalizedStructure: any) {
  if (!Array.isArray(rawStructure?.blocks) || rawStructure.blocks.length === 0) {
    if (Array.isArray(rawStructure?.steps) && rawStructure.steps.length > 0) {
      return {
        valid: false,
        reason: 'returned interval-style steps instead of native strength blocks'
      }
    }

    if (Array.isArray(rawStructure?.exercises) && rawStructure.exercises.length > 0) {
      return {
        valid: false,
        reason: 'returned flat strength exercises instead of native strength blocks'
      }
    }

    return {
      valid: false,
      reason: 'missing native strength blocks'
    }
  }

  const blocks = Array.isArray(normalizedStructure?.blocks) ? normalizedStructure.blocks : []
  if (!blocks.length) {
    return {
      valid: false,
      reason: 'native strength blocks normalized to an empty workout'
    }
  }

  let stepCount = 0
  let meaningfulStepCount = 0

  for (const block of blocks) {
    const steps = Array.isArray(block?.steps) ? block.steps : []
    for (const step of steps) {
      stepCount += 1
      if (!Array.isArray(step?.setRows) || step.setRows.length === 0) {
        return {
          valid: false,
          reason: `exercise "${step?.name || 'Unnamed exercise'}" is missing set rows`
        }
      }

      if (hasMeaningfulSetRows(step)) {
        meaningfulStepCount += 1
      }

      if (
        String(step?.prescriptionMode || '').trim() === 'duration' &&
        isLoadedLiftName(step?.name) &&
        !isTimeBasedExerciseName(step?.name)
      ) {
        return {
          valid: false,
          reason: `loaded lift "${step?.name}" should not use duration-based sets`
        }
      }

      if (getDurationSecondsFromStep(step) >= 300 && isLoadedLiftName(step?.name)) {
        return {
          valid: false,
          reason: `exercise "${step?.name}" was prescribed as one long duration block instead of real sets`
        }
      }
    }
  }

  if (!stepCount || !meaningfulStepCount) {
    return {
      valid: false,
      reason: 'strength workout has no meaningful set-level prescription'
    }
  }

  return {
    valid: true,
    reason: null
  }
}

function buildLibraryStarterRows(libraryExercise: any) {
  const setCount = Math.max(
    Number(libraryExercise?.sets || libraryExercise?.setRows?.length || 1),
    1
  )
  const starterValue =
    String(libraryExercise?.prescriptionMode || '').trim() === 'duration'
      ? normalizeText(libraryExercise?.duration ?? libraryExercise?.setRows?.[0]?.value ?? '')
      : normalizeText(libraryExercise?.reps ?? libraryExercise?.setRows?.[0]?.value ?? '').replace(
          /\/side/i,
          ''
        )

  return normalizeStrengthSetRows(libraryExercise?.setRows, setCount, {
    value: starterValue,
    loadValue: normalizeText(libraryExercise?.weight),
    restOverride: ''
  })
}

function buildSearchCorpus(exercise: any) {
  return [exercise?.title, ...(Array.isArray(exercise?.aliases) ? exercise.aliases : [])]
}

function uniqueMatch(matches: any[]) {
  const deduped = [...new Map(matches.map((match) => [match.id, match])).values()]
  return deduped.length === 1 ? deduped[0] : null
}

export function findDeterministicStrengthExerciseMatch(step: any, libraryExercises: any[]) {
  if (!Array.isArray(libraryExercises) || libraryExercises.length === 0) return null

  if (normalizeOptionalString(step?.libraryExerciseId)) {
    const byId = libraryExercises.find((exercise) => exercise.id === step.libraryExerciseId)
    if (byId) return byId
  }

  const rawName = normalizeText(step?.name)
  const exactTitleMatches = libraryExercises.filter(
    (exercise) => normalizeText(exercise?.title).toLowerCase() === rawName.toLowerCase()
  )
  const exactTitleMatch = uniqueMatch(exactTitleMatches)
  if (exactTitleMatch) return exactTitleMatch

  const normalizedName = normalizeExerciseMatchKey(rawName)
  const normalizedTitleMatches = libraryExercises.filter(
    (exercise) => normalizeExerciseMatchKey(exercise?.title) === normalizedName
  )
  const normalizedTitleMatch = uniqueMatch(normalizedTitleMatches)
  if (normalizedTitleMatch) return normalizedTitleMatch

  const aliasMatches = libraryExercises.filter((exercise) =>
    normalizeArray(exercise?.aliases).some(
      (alias) => normalizeExerciseMatchKey(alias) === normalizedName
    )
  )
  return uniqueMatch(aliasMatches)
}

function lexicalScore(step: any, libraryExercise: any) {
  const target = normalizeExerciseMatchKey(step?.name)
  const candidateTexts = buildSearchCorpus(libraryExercise)
  let bestScore = 0

  for (const text of candidateTexts) {
    const normalizedCandidate = normalizeExerciseMatchKey(text)
    if (!normalizedCandidate) continue
    if (normalizedCandidate === target) return 1

    const targetTokens = new Set(tokenizeMatchKey(target))
    const candidateTokens = new Set(tokenizeMatchKey(normalizedCandidate))
    const sharedTokens = [...targetTokens].filter((token) => candidateTokens.has(token)).length
    const overlapScore = sharedTokens / Math.max(targetTokens.size, candidateTokens.size, 1)
    const containsBonus =
      normalizedCandidate.includes(target) || target.includes(normalizedCandidate) ? 0.15 : 0
    bestScore = Math.max(bestScore, Math.min(1, overlapScore + containsBonus))
  }

  return bestScore
}

export function getStrengthExerciseMatchCandidates(
  step: any,
  libraryExercises: any[],
  limit = MAX_LLM_CANDIDATES
) {
  return [...(Array.isArray(libraryExercises) ? libraryExercises : [])]
    .map((exercise) => ({
      exercise,
      score: lexicalScore(step, exercise)
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.exercise)
}

const llmMatchSchema = {
  type: 'object',
  properties: {
    matchedId: { type: 'string' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    reason: { type: 'string' },
    noMatch: { type: 'boolean' }
  },
  required: ['confidence', 'reason', 'noMatch']
}

export async function findLlmStrengthExerciseMatch(params: {
  step: any
  candidates: any[]
  userId: string
  entityType: string
  entityId: string
  operation: string
}) {
  const { step, candidates, userId, entityType, entityId, operation } = params
  if (!Array.isArray(candidates) || candidates.length === 0) return null

  const prompt = `You are matching one generated strength exercise to a small list of saved strength exercises.

Generated exercise: "${normalizeText(step?.name)}"
Generated notes: "${normalizeText(step?.notes) || 'None'}"
Generated movement pattern: "${normalizeText(step?.movementPattern) || 'Unknown'}"

Candidates:
${candidates
  .map(
    (candidate, index) =>
      `${index + 1}. id=${candidate.id}; title="${normalizeText(candidate.title)}"; aliases="${normalizeArray(candidate.aliases).join(', ') || 'None'}"; movementPattern="${normalizeText(candidate.movementPattern) || 'Unknown'}"; notes="${normalizeText(candidate.notes) || 'None'}"`
  )
  .join('\n')}

Rules:
- Match only if you are confident this is the exact same movement.
- If there is any ambiguity, return noMatch=true.
- Prefer no match over a risky match.
- Do not infer based only on broad family similarity.

Return JSON only.`

  const result = await generateStructuredAnalysis<{
    matchedId?: string
    confidence: number
    reason: string
    noMatch: boolean
  }>(prompt, llmMatchSchema, 'flash', {
    userId,
    operation,
    entityType,
    entityId,
    maxRetries: 0,
    timeoutMs: 20000
  })

  if (result?.noMatch) return null
  if (!result?.matchedId || Number(result.confidence || 0) < MATCH_CONFIDENCE_THRESHOLD) {
    return null
  }

  return candidates.find((candidate) => candidate.id === result.matchedId) || null
}

export function applyMatchedLibraryDefaultsToStrengthStep(step: any, libraryExercise: any) {
  const existingRows = Array.isArray(step?.setRows) ? step.setRows : []
  const starterRows = buildLibraryStarterRows(libraryExercise)
  const useLibraryStructure = isWeakStrengthStep(step)

  return {
    ...step,
    libraryExerciseId: libraryExercise.id,
    videoUrl:
      normalizeOptionalString(step?.videoUrl) || normalizeOptionalString(libraryExercise?.videoUrl),
    notes: normalizeOptionalString(step?.notes) || normalizeOptionalString(libraryExercise?.notes),
    movementPattern:
      normalizeOptionalString(step?.movementPattern) ||
      normalizeOptionalString(libraryExercise?.movementPattern),
    intent:
      normalizeOptionalString(step?.intent) || normalizeOptionalString(libraryExercise?.intent),
    targetMuscleGroups:
      normalizeArray(step?.targetMuscleGroups).length > 0
        ? normalizeArray(step?.targetMuscleGroups)
        : normalizeArray(libraryExercise?.targetMuscleGroups),
    prescriptionMode: useLibraryStructure
      ? normalizeOptionalString(libraryExercise?.prescriptionMode) ||
        normalizeOptionalString(step?.prescriptionMode) ||
        'reps'
      : normalizeOptionalString(step?.prescriptionMode) ||
        normalizeOptionalString(libraryExercise?.prescriptionMode) ||
        'reps',
    loadMode: useLibraryStructure
      ? normalizeOptionalString(libraryExercise?.loadMode) ||
        normalizeOptionalString(step?.loadMode) ||
        'none'
      : normalizeOptionalString(step?.loadMode) ||
        normalizeOptionalString(libraryExercise?.loadMode) ||
        'none',
    defaultRest: useLibraryStructure
      ? normalizeOptionalString(step?.defaultRest) ||
        normalizeOptionalString(libraryExercise?.defaultRest) ||
        normalizeOptionalString(libraryExercise?.rest) ||
        ''
      : normalizeOptionalString(step?.defaultRest) ||
        normalizeOptionalString(libraryExercise?.defaultRest) ||
        '',
    showRestColumn: useLibraryStructure
      ? Boolean(step?.showRestColumn || starterRows.some((row) => normalizeText(row.restOverride)))
      : Boolean(
          step?.showRestColumn || existingRows.some((row: any) => normalizeText(row?.restOverride))
        ),
    setRows: useLibraryStructure ? starterRows : existingRows
  }
}

export async function applyStrengthLibraryDefaultsToWorkout(params: {
  structuredWorkout: any
  libraryExercises: any[]
  userId: string
  entityType: string
  entityId: string
  operation: string
}) {
  const { structuredWorkout, libraryExercises, userId, entityType, entityId, operation } = params
  if (!Array.isArray(structuredWorkout?.blocks) || !libraryExercises.length) {
    return {
      structuredWorkout,
      matchedCount: 0
    }
  }

  let matchedCount = 0
  const blocks = []

  for (const block of structuredWorkout.blocks) {
    const nextSteps = []

    for (const step of Array.isArray(block?.steps) ? block.steps : []) {
      let matchedExercise = findDeterministicStrengthExerciseMatch(step, libraryExercises)

      if (!matchedExercise) {
        const candidates = getStrengthExerciseMatchCandidates(step, libraryExercises)
        matchedExercise = await findLlmStrengthExerciseMatch({
          step,
          candidates,
          userId,
          entityType,
          entityId,
          operation
        })
      }

      if (matchedExercise) {
        matchedCount += 1
        nextSteps.push(applyMatchedLibraryDefaultsToStrengthStep(step, matchedExercise))
      } else {
        nextSteps.push(step)
      }
    }

    blocks.push({
      ...block,
      steps: nextSteps
    })
  }

  return {
    structuredWorkout: {
      ...structuredWorkout,
      blocks
    },
    matchedCount
  }
}
