const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'])

const STRENGTH_BLOCK_TYPES = new Set([
  'warmup',
  'single_exercise',
  'cooldown',
  'superset',
  'circuit'
])

const STRENGTH_PRESCRIPTION_MODES = new Set([
  'reps',
  'reps_per_side',
  'duration',
  'distance_meters',
  'distance_km',
  'distance_ft',
  'distance_yd',
  'distance_miles'
])

const STRENGTH_LOAD_MODES = new Set([
  'none',
  'generic',
  'weight_lb',
  'weight_kg',
  'weight_per_side_lb',
  'weight_per_side_kg'
])

function parseUrl(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    return new URL(value.trim())
  } catch {
    return null
  }
}

function createId(prefix: string, index = 0) {
  return `${prefix}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`
}

function inferBlockType(title: unknown) {
  const normalized = String(title || '')
    .trim()
    .toLowerCase()

  if (normalized.includes('warm')) return 'warmup'
  if (normalized.includes('cool')) return 'cooldown'
  if (normalized.includes('super')) return 'superset'
  if (normalized.includes('circuit')) return 'circuit'
  return 'single_exercise'
}

function sanitizeTitle(type: string, value: unknown) {
  const title = String(value || '').trim()
  if (title) return title
  if (type === 'warmup') return 'Warm Up'
  if (type === 'cooldown') return 'Cooldown'
  if (type === 'superset') return 'Superset'
  if (type === 'circuit') return 'Circuit'
  return 'Single Exercise'
}

function normalizeOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((entry) => String(entry || '').trim()).filter(Boolean))]
}

function normalizePositiveInt(value: unknown) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? Math.trunc(numeric) : undefined
}

function normalizeNumber(value: unknown) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

function normalizePrescriptionMode(value: unknown) {
  const normalized = String(value || '').trim()
  return STRENGTH_PRESCRIPTION_MODES.has(normalized) ? normalized : 'reps'
}

function normalizeLoadMode(value: unknown) {
  const normalized = String(value || '').trim()
  return STRENGTH_LOAD_MODES.has(normalized) ? normalized : 'none'
}

function inferLoadMode(weight: unknown) {
  const normalized = String(weight || '')
    .trim()
    .toLowerCase()

  if (!normalized) return 'none'
  if (normalized.includes('/side') && normalized.includes('lb')) return 'weight_per_side_lb'
  if (normalized.includes('/side') && normalized.includes('kg')) return 'weight_per_side_kg'
  if (normalized.includes('lb')) return 'weight_lb'
  if (normalized.includes('kg')) return 'weight_kg'
  return 'generic'
}

function normalizeValue(value: unknown) {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : undefined
  if (typeof value === 'string' && value.trim()) return value.trim()
  return undefined
}

function summarizeSetRows(
  setRows: Array<{ value?: string; loadValue?: string; restOverride?: string }>,
  field: 'value' | 'loadValue'
) {
  const values = setRows.map((row) => String(row?.[field] || '').trim()).filter(Boolean)

  if (!values.length) return undefined
  const uniqueValues = [...new Set(values)]
  return uniqueValues.length === 1 ? uniqueValues[0] : uniqueValues.join(', ')
}

export function extractYouTubeVideoId(value: unknown): string | null {
  const url = parseUrl(value)
  if (!url || !YOUTUBE_HOSTS.has(url.hostname)) return null

  if (url.hostname === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0]
    return id || null
  }

  if (url.pathname === '/watch') {
    return url.searchParams.get('v')
  }

  const parts = url.pathname.split('/').filter(Boolean)
  const embedIndex = parts.findIndex((part) => part === 'embed' || part === 'shorts')
  if (embedIndex >= 0) return parts[embedIndex + 1] || null

  return null
}

export function normalizeYouTubeUrl(value: unknown): string | null {
  const videoId = extractYouTubeVideoId(value)
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null
}

export function normalizeStrengthSetRows(
  setRows: unknown,
  desiredCount?: number,
  template?: { value?: string; loadValue?: string; restOverride?: string }
) {
  const rows = Array.isArray(setRows) ? setRows : []
  const normalized = rows.map((row: any, index: number) => ({
    id: typeof row?.id === 'string' && row.id.trim() ? row.id.trim() : createId('set', index),
    index: index + 1,
    value: normalizeValue(row?.value) || '',
    loadValue: normalizeValue(row?.loadValue) || '',
    restOverride: normalizeOptionalString(row?.restOverride) || ''
  }))

  const targetCount = Math.max(desiredCount || normalized.length || 1, 1)
  while (normalized.length < targetCount) {
    normalized.push({
      id: createId('set', normalized.length),
      index: normalized.length + 1,
      value: String(template?.value || '').trim(),
      loadValue: String(template?.loadValue || '').trim(),
      restOverride: String(template?.restOverride || '').trim()
    })
  }

  return normalized.slice(0, targetCount).map((row, index) => ({
    ...row,
    index: index + 1
  }))
}

function inferLegacyPrescriptionMode(input: any) {
  const duration = Number(input?.duration)
  if (Number.isFinite(duration) && duration > 0) return 'duration'

  const explicit = String(input?.prescriptionType || '').trim()
  if (STRENGTH_PRESCRIPTION_MODES.has(explicit)) return explicit

  const reps = String(input?.reps || '')
    .trim()
    .toLowerCase()
  if (reps.includes('/side')) return 'reps_per_side'

  const valueUnit = String(input?.valueUnit || '')
    .trim()
    .toLowerCase()
  if (valueUnit === 'meters' || valueUnit === 'm') return 'distance_meters'
  if (valueUnit === 'km') return 'distance_km'
  if (valueUnit === 'ft') return 'distance_ft'
  if (valueUnit === 'yd') return 'distance_yd'
  if (valueUnit === 'miles' || valueUnit === 'mi') return 'distance_miles'
  return 'reps'
}

function inferLegacyValue(input: any, prescriptionMode: string) {
  if (prescriptionMode === 'duration') {
    const duration = normalizePositiveInt(input?.duration)
    return duration ? String(duration) : ''
  }

  if (prescriptionMode.startsWith('distance_')) {
    return normalizeValue(input?.value) || ''
  }

  const reps = String(input?.reps || '').trim()
  if (!reps) return ''
  return prescriptionMode === 'reps_per_side' ? reps.replace(/\/side/i, '').trim() || reps : reps
}

function buildLibrarySummaryFields(normalized: Record<string, any>) {
  const setRows = Array.isArray(normalized.setRows) ? normalized.setRows : []
  const valueSummary = summarizeSetRows(setRows, 'value')
  const loadSummary = summarizeSetRows(setRows, 'loadValue')
  const firstRestOverride = setRows.find((row: any) => row?.restOverride)?.restOverride

  normalized.sets = setRows.length || undefined
  normalized.weight = loadSummary
  normalized.rest = normalized.defaultRest || firstRestOverride || undefined

  if (normalized.prescriptionMode === 'duration') {
    const duration = normalizePositiveInt(valueSummary)
    normalized.duration = duration
    delete normalized.reps
  } else if (valueSummary) {
    normalized.reps =
      normalized.prescriptionMode === 'reps_per_side' ? `${valueSummary}/side` : valueSummary
    delete normalized.duration
  } else {
    delete normalized.reps
    delete normalized.duration
  }
}

export function normalizeStrengthExerciseLibraryItem(input: any) {
  const normalized: Record<string, any> = {
    title: String(input?.title || '').trim()
  }

  if (!normalized.title) {
    throw new Error('Exercise title is required')
  }

  if (normalizeOptionalString(input?.intent)) normalized.intent = input.intent.trim()
  if (normalizeOptionalString(input?.movementPattern)) {
    normalized.movementPattern = input.movementPattern.trim()
  }
  normalized.targetMuscleGroups = normalizeStringArray(input?.targetMuscleGroups)
  if (normalizeOptionalString(input?.notes)) normalized.notes = input.notes.trim()
  if (normalizeOptionalString(input?.videoUrl)) {
    const normalizedVideoUrl = normalizeYouTubeUrl(input.videoUrl)
    if (!normalizedVideoUrl) {
      throw new Error('Only valid YouTube URLs are supported for exercise videos')
    }
    normalized.videoUrl = normalizedVideoUrl
  }

  const legacySets = Array.isArray(input?.setRows)
    ? undefined
    : normalizePositiveInt(input?.sets) || 1
  const legacyWeight = normalizeOptionalString(input?.weight) || ''
  const legacyRest = normalizeOptionalString(input?.rest) || ''
  const legacyPrescriptionMode = inferLegacyPrescriptionMode(input)
  const legacyValue = inferLegacyValue(input, legacyPrescriptionMode)

  normalized.prescriptionMode = normalizePrescriptionMode(
    input?.prescriptionMode || legacyPrescriptionMode
  )
  normalized.loadMode = normalizeLoadMode(input?.loadMode || inferLoadMode(input?.weight))
  normalized.defaultRest = normalizeOptionalString(input?.defaultRest || input?.rest)
  normalized.setRows = normalizeStrengthSetRows(input?.setRows, legacySets, {
    value: legacyValue,
    loadValue: legacyWeight,
    restOverride: ''
  })

  if (Number.isFinite(Number(input?.rpe)) && Number(input.rpe) > 0) {
    normalized.rpe = Number(input.rpe)
  }

  buildLibrarySummaryFields(normalized)
  return normalized
}

export function normalizeStructuredStrengthExercise(input: any) {
  const normalized = normalizeStrengthExerciseLibraryItem({
    ...input,
    title: input?.name
  })

  const structured: Record<string, any> = {
    name: normalized.title
  }

  if (typeof input?.group === 'string' && input.group.trim()) structured.group = input.group.trim()
  if (typeof input?.libraryExerciseId === 'string' && input.libraryExerciseId.trim()) {
    structured.libraryExerciseId = input.libraryExerciseId.trim()
  }
  if (normalized.intent) structured.intent = normalized.intent
  if (normalized.movementPattern) structured.movementPattern = normalized.movementPattern
  if (normalized.targetMuscleGroups?.length) {
    structured.targetMuscleGroups = normalized.targetMuscleGroups
  }
  if (normalized.notes) structured.notes = normalized.notes
  if (normalized.videoUrl) structured.videoUrl = normalized.videoUrl
  if (normalized.sets) structured.sets = normalized.sets
  if (normalized.reps) structured.reps = normalized.reps
  if (normalized.weight) structured.weight = normalized.weight
  if (normalized.duration) structured.duration = normalized.duration
  if (normalized.rest) structured.rest = normalized.rest
  if (normalized.rpe) structured.rpe = normalized.rpe
  if (normalized.prescriptionMode) structured.prescriptionMode = normalized.prescriptionMode
  if (normalized.loadMode) structured.loadMode = normalized.loadMode
  if (normalized.defaultRest) structured.defaultRest = normalized.defaultRest
  if (Array.isArray(normalized.setRows)) structured.setRows = normalized.setRows

  return structured
}

export function normalizeStructuredStrengthExercises(exercises: unknown) {
  if (!Array.isArray(exercises)) return []
  return exercises.map((exercise) => normalizeStructuredStrengthExercise(exercise))
}

function normalizeLegacyExerciseToStep(input: any, index: number) {
  const legacySets = normalizePositiveInt(input?.sets) || 1
  const prescriptionMode = inferLegacyPrescriptionMode(input)
  const starterValue = inferLegacyValue(input, prescriptionMode)
  const starterLoad = normalizeOptionalString(input?.weight) || ''

  const step: Record<string, any> = {
    id: input?.id || input?._id || createId('step', index),
    name: String(input?.name || '').trim(),
    prescriptionMode,
    loadMode: inferLoadMode(input?.weight),
    defaultRest: normalizeOptionalString(input?.rest),
    showRestColumn: false,
    setRows: normalizeStrengthSetRows(input?.setRows, legacySets, {
      value: starterValue,
      loadValue: starterLoad
    })
  }

  if (!step.name) {
    throw new Error('Strength steps require an exercise name')
  }

  if (typeof input?.libraryExerciseId === 'string' && input.libraryExerciseId.trim()) {
    step.libraryExerciseId = input.libraryExerciseId.trim()
  }
  if (normalizeOptionalString(input?.videoUrl)) {
    const normalizedVideoUrl = normalizeYouTubeUrl(input.videoUrl)
    if (!normalizedVideoUrl) {
      throw new Error('Only valid YouTube URLs are supported for exercise videos')
    }
    step.videoUrl = normalizedVideoUrl
  }
  if (normalizeOptionalString(input?.notes)) step.notes = input.notes.trim()
  if (normalizeOptionalString(input?.movementPattern))
    step.movementPattern = input.movementPattern.trim()
  if (normalizeOptionalString(input?.intent)) step.intent = input.intent.trim()
  if (normalizeStringArray(input?.targetMuscleGroups).length) {
    step.targetMuscleGroups = normalizeStringArray(input?.targetMuscleGroups)
  }

  return step
}

function normalizeStep(step: any, blockIndex: number, stepIndex: number) {
  const legacySets = Array.isArray(step?.setRows)
    ? undefined
    : normalizePositiveInt(step?.sets) || 1
  const legacyMode = inferLegacyPrescriptionMode(step)
  const starterValue = inferLegacyValue(step, legacyMode)
  const starterLoad = normalizeOptionalString(step?.weight) || ''

  const normalizedStep: Record<string, any> = {
    id:
      typeof step?.id === 'string' && step.id.trim()
        ? step.id.trim()
        : createId(`step-${blockIndex}`, stepIndex),
    name: String(step?.name || '').trim()
  }

  if (!normalizedStep.name) {
    throw new Error('Strength steps require an exercise name')
  }

  if (typeof step?.libraryExerciseId === 'string' && step.libraryExerciseId.trim()) {
    normalizedStep.libraryExerciseId = step.libraryExerciseId.trim()
  }
  if (normalizeOptionalString(step?.videoUrl)) {
    const normalizedVideoUrl = normalizeYouTubeUrl(step.videoUrl)
    if (!normalizedVideoUrl) {
      throw new Error('Only valid YouTube URLs are supported for exercise videos')
    }
    normalizedStep.videoUrl = normalizedVideoUrl
  }
  if (normalizeOptionalString(step?.notes)) normalizedStep.notes = step.notes.trim()
  if (normalizeOptionalString(step?.movementPattern)) {
    normalizedStep.movementPattern = step.movementPattern.trim()
  }
  if (normalizeOptionalString(step?.intent)) normalizedStep.intent = step.intent.trim()
  if (normalizeStringArray(step?.targetMuscleGroups).length) {
    normalizedStep.targetMuscleGroups = normalizeStringArray(step?.targetMuscleGroups)
  }

  normalizedStep.prescriptionMode = normalizePrescriptionMode(step?.prescriptionMode || legacyMode)
  normalizedStep.loadMode = normalizeLoadMode(step?.loadMode || inferLoadMode(step?.weight))
  normalizedStep.defaultRest = normalizeOptionalString(step?.defaultRest || step?.rest)
  normalizedStep.setRows = normalizeStrengthSetRows(step?.setRows, legacySets, {
    value: starterValue,
    loadValue: starterLoad
  })
  normalizedStep.showRestColumn =
    typeof step?.showRestColumn === 'boolean'
      ? step.showRestColumn
      : normalizedStep.setRows.some((row: any) => row?.restOverride)

  return normalizedStep
}

export function normalizeStructuredStrengthBlocks(blocks: unknown, legacyExercises?: unknown) {
  if (Array.isArray(blocks) && blocks.length > 0) {
    return blocks.map((block: any, blockIndex: number) => {
      const type = STRENGTH_BLOCK_TYPES.has(String(block?.type || '').trim())
        ? String(block.type).trim()
        : inferBlockType(block?.title)

      const normalizedBlock: Record<string, any> = {
        id:
          typeof block?.id === 'string' && block.id.trim()
            ? block.id.trim()
            : createId('block', blockIndex),
        type,
        title: sanitizeTitle(type, block?.title),
        steps: []
      }

      if (normalizeOptionalString(block?.notes)) normalizedBlock.notes = block.notes.trim()
      if (Number.isFinite(Number(block?.durationSec)) && Number(block.durationSec) > 0) {
        normalizedBlock.durationSec = Math.trunc(Number(block.durationSec))
      }

      normalizedBlock.steps = Array.isArray(block?.steps)
        ? block.steps.map((step: any, stepIndex: number) =>
            normalizeStep(step, blockIndex, stepIndex)
          )
        : []

      return normalizedBlock
    })
  }

  if (Array.isArray(legacyExercises) && legacyExercises.length > 0) {
    const groupMap = new Map<string, any>()

    for (const [index, exercise] of legacyExercises.entries()) {
      const title = String(exercise?.group || exercise?.phase || '').trim() || 'Routine'
      if (!groupMap.has(title)) {
        const type = inferBlockType(title)
        groupMap.set(title, {
          id: createId('block', groupMap.size),
          type,
          title: sanitizeTitle(type, title),
          steps: []
        })
      }

      groupMap.get(title).steps.push(normalizeLegacyExerciseToStep(exercise, index))
    }

    return [...groupMap.values()]
  }

  return []
}

export function flattenStrengthBlocksToExercises(blocks: unknown) {
  const normalizedBlocks = normalizeStructuredStrengthBlocks(blocks)
  const exercises: Record<string, any>[] = []

  for (const block of normalizedBlocks) {
    for (const step of block.steps || []) {
      const setRows = Array.isArray(step.setRows) ? step.setRows : []
      const valueSummary = summarizeSetRows(setRows, 'value')
      const loadSummary = summarizeSetRows(setRows, 'loadValue')
      const firstRestOverride = setRows.find((row: any) => row?.restOverride)?.restOverride

      const exercise: Record<string, any> = {
        id: step.id,
        group: block.title,
        name: step.name,
        sets: setRows.length || 1,
        prescriptionType: step.prescriptionMode
      }

      if (step.libraryExerciseId) exercise.libraryExerciseId = step.libraryExerciseId
      if (step.videoUrl) exercise.videoUrl = step.videoUrl
      if (step.notes) exercise.notes = step.notes
      if (step.movementPattern) exercise.movementPattern = step.movementPattern
      if (step.intent) exercise.intent = step.intent
      if (loadSummary) exercise.weight = loadSummary
      if (step.defaultRest || firstRestOverride)
        exercise.rest = step.defaultRest || firstRestOverride

      if (step.prescriptionMode === 'duration') {
        const duration = normalizePositiveInt(valueSummary)
        if (duration) exercise.duration = duration
      } else if (valueSummary) {
        exercise.reps =
          step.prescriptionMode === 'reps_per_side' ? `${valueSummary}/side` : valueSummary
      }

      if (step.prescriptionMode.startsWith('distance_') && valueSummary) {
        exercise.value = valueSummary
        exercise.valueUnit = step.prescriptionMode.replace('distance_', '')
      }

      exercises.push(exercise)
    }
  }

  return exercises
}

export function normalizeStructuredStrengthWorkout(structuredWorkout: any) {
  const blocks = normalizeStructuredStrengthBlocks(
    structuredWorkout?.blocks,
    structuredWorkout?.exercises
  )

  return {
    ...(structuredWorkout || {}),
    blocks,
    exercises: flattenStrengthBlocksToExercises(blocks)
  }
}
