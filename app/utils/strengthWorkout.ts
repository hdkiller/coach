export type StrengthPrescriptionMode =
  | 'reps'
  | 'reps_per_side'
  | 'duration'
  | 'distance_meters'
  | 'distance_km'
  | 'distance_ft'
  | 'distance_yd'
  | 'distance_miles'

export type StrengthLoadMode =
  | 'none'
  | 'generic'
  | 'weight_lb'
  | 'weight_kg'
  | 'weight_per_side_lb'
  | 'weight_per_side_kg'

export type StrengthSetRow = {
  id: string
  index: number
  value?: string
  loadValue?: string
  restOverride?: string
}

export type StrengthExercise = Record<string, any> & {
  id?: string
  _id?: string
  libraryExerciseId?: string
  videoUrl?: string
  group?: string
  phase?: string
  name?: string
  sets?: number
  reps?: string
  duration?: number
  prescriptionType?: StrengthPrescriptionMode
  value?: string | number
  valueUnit?: string
  weight?: string
  rest?: string
  notes?: string
  movementPattern?: string
  intent?: string
}

export type StrengthExerciseGroup = {
  id: string
  name: string
  exercises: StrengthExercise[]
}

export type StrengthBlockType = 'warmup' | 'single_exercise' | 'cooldown' | 'superset' | 'circuit'

export type StrengthBlockStep = {
  id: string
  libraryExerciseId?: string
  name: string
  videoUrl?: string
  notes?: string
  movementPattern?: string
  intent?: string
  prescriptionMode: StrengthPrescriptionMode
  loadMode: StrengthLoadMode
  defaultRest?: string
  showRestColumn?: boolean
  setRows: StrengthSetRow[]
}

export type StrengthBlock = {
  id: string
  type: StrengthBlockType
  title: string
  notes?: string
  durationSec?: number
  steps: StrengthBlockStep[]
}

export type StrengthWorkoutSummary = {
  blockCount: number
  exerciseCount: number
  totalSets: number
  durationSec: number
}

const DEFAULT_GROUP_NAME = 'Routine'
const DEFAULT_BLOCK_TYPE: StrengthBlockType = 'single_exercise'
export const DEFAULT_PRESCRIPTION_MODE: StrengthPrescriptionMode = 'reps'
export const DEFAULT_LOAD_MODE: StrengthLoadMode = 'none'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

export function createStrengthId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function sanitizeGroupName(value: unknown) {
  const name = String(value || '').trim()
  return name || DEFAULT_GROUP_NAME
}

export function inferBlockType(title: unknown): StrengthBlockType {
  const normalized = String(title || '')
    .trim()
    .toLowerCase()

  if (!normalized) return DEFAULT_BLOCK_TYPE
  if (normalized.includes('warm')) return 'warmup'
  if (normalized.includes('cool')) return 'cooldown'
  if (normalized.includes('super')) return 'superset'
  if (normalized.includes('circuit')) return 'circuit'
  return 'single_exercise'
}

function inferLoadMode(weight: unknown): StrengthLoadMode {
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

function inferPrescriptionMode(exercise: StrengthExercise): StrengthPrescriptionMode {
  const duration = Number(exercise?.duration)
  if (Number.isFinite(duration) && duration > 0) return 'duration'

  const explicit = String(exercise?.prescriptionType || '').trim()
  if (
    explicit === 'reps' ||
    explicit === 'reps_per_side' ||
    explicit === 'duration' ||
    explicit === 'distance_meters' ||
    explicit === 'distance_km' ||
    explicit === 'distance_ft' ||
    explicit === 'distance_yd' ||
    explicit === 'distance_miles'
  ) {
    return explicit
  }

  const reps = String(exercise?.reps || '')
    .trim()
    .toLowerCase()
  if (reps.includes('/side')) return 'reps_per_side'

  const valueUnit = String(exercise?.valueUnit || '')
    .trim()
    .toLowerCase()
  if (valueUnit === 'meters' || valueUnit === 'm') return 'distance_meters'
  if (valueUnit === 'km') return 'distance_km'
  if (valueUnit === 'ft') return 'distance_ft'
  if (valueUnit === 'yd') return 'distance_yd'
  if (valueUnit === 'miles' || valueUnit === 'mi') return 'distance_miles'

  return DEFAULT_PRESCRIPTION_MODE
}

function inferStarterValue(exercise: StrengthExercise, mode: StrengthPrescriptionMode) {
  if (mode === 'duration') {
    const duration = Number(exercise?.duration)
    return Number.isFinite(duration) && duration > 0 ? String(Math.trunc(duration)) : ''
  }

  if (mode.startsWith('distance_')) {
    const value = String(exercise?.value || '').trim()
    return value
  }

  const reps = String(exercise?.reps || '').trim()
  if (!reps) return ''
  return mode === 'reps_per_side' ? reps.replace(/\/side/i, '').trim() || reps : reps
}

export function createStrengthSetRow(overrides: Partial<StrengthSetRow> = {}): StrengthSetRow {
  return {
    id: createStrengthId('set'),
    index: 1,
    value: '',
    loadValue: '',
    restOverride: '',
    ...overrides
  }
}

export function createStrengthBlockStep(
  overrides: Partial<StrengthBlockStep> = {}
): StrengthBlockStep {
  const normalizedSetRows = normalizeStrengthSetRows(overrides?.setRows)

  return {
    id: createStrengthId('step'),
    name: '',
    videoUrl: '',
    notes: '',
    movementPattern: '',
    intent: '',
    prescriptionMode: DEFAULT_PRESCRIPTION_MODE,
    loadMode: DEFAULT_LOAD_MODE,
    defaultRest: '',
    showRestColumn: false,
    ...overrides,
    setRows: normalizedSetRows
  }
}

export function createStrengthBlock(
  type: StrengthBlockType = DEFAULT_BLOCK_TYPE,
  overrides: Partial<StrengthBlock> = {}
): StrengthBlock {
  const defaultTitle =
    type === 'warmup'
      ? 'Warm Up'
      : type === 'cooldown'
        ? 'Cooldown'
        : type === 'superset'
          ? 'Superset'
          : type === 'circuit'
            ? 'Circuit'
            : 'Single Exercise'

  return {
    id: createStrengthId('block'),
    type,
    title: defaultTitle,
    notes: '',
    durationSec: undefined,
    steps: [],
    ...overrides
  }
}

export function normalizeStrengthSetRows(
  setRows: Partial<StrengthSetRow>[] | undefined | null,
  desiredCount?: number,
  template?: Partial<StrengthSetRow>
) {
  const rows = Array.isArray(setRows) ? setRows : []
  const normalized = rows.map((row, index) =>
    createStrengthSetRow({
      id: row?.id || createStrengthId('set'),
      index: index + 1,
      value: String(row?.value || '').trim(),
      loadValue: String(row?.loadValue || '').trim(),
      restOverride: String(row?.restOverride || '').trim()
    })
  )

  const targetCount = Math.max(desiredCount || normalized.length || 1, 1)
  while (normalized.length < targetCount) {
    normalized.push(
      createStrengthSetRow({
        index: normalized.length + 1,
        value: String(template?.value || '').trim(),
        loadValue: String(template?.loadValue || '').trim(),
        restOverride: String(template?.restOverride || '').trim()
      })
    )
  }

  return normalized.slice(0, targetCount).map((row, index) => ({
    ...row,
    index: index + 1
  }))
}

function normalizeLegacyExerciseToStep(exercise: StrengthExercise): StrengthBlockStep {
  const prescriptionMode = inferPrescriptionMode(exercise)
  const setCount =
    Number.isFinite(Number(exercise?.sets)) && Number(exercise?.sets) > 0
      ? Math.trunc(Number(exercise.sets))
      : 1
  const value = inferStarterValue(exercise, prescriptionMode)
  const loadValue = String(exercise?.weight || '').trim()
  const defaultRest = String(exercise?.rest || '').trim()

  return createStrengthBlockStep({
    id: exercise.id || exercise._id || createStrengthId('step'),
    libraryExerciseId:
      typeof exercise.libraryExerciseId === 'string' ? exercise.libraryExerciseId : '',
    name: String(exercise?.name || '').trim(),
    videoUrl: String(exercise?.videoUrl || '').trim(),
    notes: String(exercise?.notes || '').trim(),
    movementPattern: String(exercise?.movementPattern || '').trim(),
    intent: String(exercise?.intent || '').trim(),
    prescriptionMode,
    loadMode: inferLoadMode(exercise?.weight),
    defaultRest,
    showRestColumn: Array.isArray(exercise?.setRows)
      ? exercise.setRows.some((row: any) => String(row?.restOverride || '').trim())
      : false,
    setRows: normalizeStrengthSetRows(
      Array.from({ length: setCount }, () => ({
        value,
        loadValue
      })),
      setCount,
      { value, loadValue }
    )
  })
}

function nextId(prefix: string, index: number) {
  return `${prefix}-${index + 1}`
}

export function getStrengthExerciseGroupName(exercise: StrengthExercise) {
  return sanitizeGroupName(exercise?.group || exercise?.phase)
}

export function groupStrengthExercises(exercises: StrengthExercise[] | undefined | null) {
  const grouped: StrengthExerciseGroup[] = []
  const groupMap = new Map<string, StrengthExerciseGroup>()

  for (const [index, exercise] of (exercises || []).entries()) {
    const clonedExercise = clone(exercise || {})
    const groupName = getStrengthExerciseGroupName(clonedExercise)
    delete clonedExercise.phase

    let targetGroup = groupMap.get(groupName)
    if (!targetGroup) {
      targetGroup = {
        id: nextId('group', grouped.length),
        name: groupName,
        exercises: []
      }
      groupMap.set(groupName, targetGroup)
      grouped.push(targetGroup)
    }

    targetGroup.exercises.push({
      ...clonedExercise,
      group: groupName,
      _id: clonedExercise._id || nextId(`exercise-${index}`, targetGroup.exercises.length)
    })
  }

  if (grouped.length === 0) {
    return [
      {
        id: 'group-1',
        name: DEFAULT_GROUP_NAME,
        exercises: []
      }
    ]
  }

  return grouped
}

function normalizeExistingStep(step: any, index: number) {
  const legacySetCount = Array.isArray(step?.setRows)
    ? undefined
    : Number.isFinite(Number(step?.sets)) && Number(step?.sets) > 0
      ? Math.trunc(Number(step.sets))
      : 1
  const prescriptionMode = inferPrescriptionMode(step)
  const starterValue = inferStarterValue(step, prescriptionMode)
  const starterLoad = String(step?.weight || '').trim()
  const defaultRest = String(step?.defaultRest || step?.rest || '').trim()
  const hasRestOverrides = Array.isArray(step?.setRows)
    ? step.setRows.some((row: any) => String(row?.restOverride || '').trim())
    : false

  return createStrengthBlockStep({
    id: step?.id || nextId(`step-${index}`, index),
    libraryExerciseId: String(step?.libraryExerciseId || '').trim(),
    name: String(step?.name || '').trim(),
    videoUrl: String(step?.videoUrl || '').trim(),
    notes: String(step?.notes || '').trim(),
    movementPattern: String(step?.movementPattern || '').trim(),
    intent: String(step?.intent || '').trim(),
    prescriptionMode: (String(step?.prescriptionMode || '').trim() ||
      prescriptionMode) as StrengthPrescriptionMode,
    loadMode: (String(step?.loadMode || '').trim() ||
      inferLoadMode(step?.weight)) as StrengthLoadMode,
    defaultRest,
    showRestColumn:
      typeof step?.showRestColumn === 'boolean' ? step.showRestColumn : hasRestOverrides,
    setRows: normalizeStrengthSetRows(
      Array.isArray(step?.setRows)
        ? step.setRows
        : Array.from({ length: legacySetCount || 1 }, () => ({
            value: String(step?.value || starterValue || '').trim(),
            loadValue: starterLoad
          })),
      legacySetCount,
      {
        value: String(step?.value || starterValue || '').trim(),
        loadValue: starterLoad
      }
    )
  })
}

export function normalizeStrengthBlocks(structuredWorkout: any): StrengthBlock[] {
  if (Array.isArray(structuredWorkout?.blocks) && structuredWorkout.blocks.length > 0) {
    return structuredWorkout.blocks.map((block: any, index: number) =>
      createStrengthBlock(block?.type || inferBlockType(block?.title), {
        id: block?.id || nextId('block', index),
        title: String(block?.title || '').trim() || createStrengthBlock(block?.type).title,
        notes: String(block?.notes || '').trim(),
        durationSec:
          Number.isFinite(Number(block?.durationSec)) && Number(block.durationSec) > 0
            ? Math.trunc(Number(block.durationSec))
            : undefined,
        steps: Array.isArray(block?.steps)
          ? block.steps.map((step: any, stepIndex: number) =>
              normalizeExistingStep(step, stepIndex)
            )
          : []
      })
    )
  }

  if (!Array.isArray(structuredWorkout?.exercises) || structuredWorkout.exercises.length === 0) {
    return []
  }

  const groups = groupStrengthExercises(structuredWorkout?.exercises)
  return groups.map((group, index) =>
    createStrengthBlock(inferBlockType(group.name), {
      id: group.id || nextId('block', index),
      title: group.name,
      steps: group.exercises.map((exercise) => normalizeLegacyExerciseToStep(exercise))
    })
  )
}

function summarizeSetRows(
  setRows: StrengthSetRow[],
  field: 'value' | 'loadValue' | 'restOverride'
) {
  const values = setRows.map((row) => String(row?.[field] || '').trim()).filter(Boolean)

  if (!values.length) return ''
  const uniqueValues = [...new Set(values)]
  if (uniqueValues.length === 1) return uniqueValues[0] || ''
  return uniqueValues.join(', ')
}

export function flattenStrengthBlocksToExercises(blocks: StrengthBlock[] | undefined | null) {
  const flattened: StrengthExercise[] = []

  for (const block of blocks || []) {
    const groupName = sanitizeGroupName(block?.title)
    for (const step of block?.steps || []) {
      const setCount = (step.setRows || []).length || 1
      const valueSummary = summarizeSetRows(step.setRows || [], 'value')
      const loadSummary = summarizeSetRows(step.setRows || [], 'loadValue')
      const restSummary =
        String(step?.defaultRest || '').trim() ||
        summarizeSetRows(step.setRows || [], 'restOverride')

      const exercise: StrengthExercise = {
        id: step.id,
        libraryExerciseId: String(step?.libraryExerciseId || '').trim() || undefined,
        name: String(step?.name || '').trim(),
        group: groupName,
        notes: String(step?.notes || '').trim() || undefined,
        movementPattern: String(step?.movementPattern || '').trim() || undefined,
        intent: String(step?.intent || '').trim() || undefined,
        videoUrl: String(step?.videoUrl || '').trim() || undefined,
        sets: setCount,
        prescriptionType: step.prescriptionMode,
        weight: loadSummary || undefined,
        rest: restSummary || undefined
      }

      if (step.prescriptionMode === 'duration') {
        const duration = Number(valueSummary)
        if (Number.isFinite(duration) && duration > 0) exercise.duration = Math.trunc(duration)
      } else if (valueSummary) {
        exercise.reps =
          step.prescriptionMode === 'reps_per_side' ? `${valueSummary}/side` : valueSummary
      }

      if (step.prescriptionMode.startsWith('distance_') && valueSummary) {
        exercise.value = valueSummary
        exercise.valueUnit = step.prescriptionMode.replace('distance_', '')
      }

      flattened.push(exercise)
    }
  }

  return flattened
}

function estimateSetRowDurationSec(step: StrengthBlockStep, row: StrengthSetRow) {
  const value = String(row?.value || '').trim()
  if (step.prescriptionMode === 'duration') {
    const duration = Number(value)
    return Number.isFinite(duration) && duration > 0 ? Math.trunc(duration) : 0
  }

  let reps = 10
  const match = value.match(/\d+/)
  if (match) reps = Number(match[0])
  const repDurationSec = 5
  const workDurationSec = reps * repDurationSec

  const restText = String(row?.restOverride || step?.defaultRest || '')
    .trim()
    .toLowerCase()
  let restDurationSec = 90
  if (restText) {
    if (restText.includes('m') && !restText.includes('ms')) {
      restDurationSec = (parseFloat(restText) || 0) * 60
    } else {
      restDurationSec = parseFloat(restText) || 90
    }
  }

  return Math.round(workDurationSec + restDurationSec)
}

export function summarizeStrengthBlocks(
  blocks: StrengthBlock[] | undefined | null
): StrengthWorkoutSummary {
  const normalizedBlocks = blocks || []
  let exerciseCount = 0
  let totalSets = 0
  let durationSec = 0

  for (const block of normalizedBlocks) {
    durationSec +=
      Number.isFinite(Number(block?.durationSec)) && Number(block.durationSec) > 0
        ? Math.trunc(Number(block.durationSec))
        : 0

    for (const step of block?.steps || []) {
      exerciseCount += 1
      totalSets += (step.setRows || []).length
      for (const row of step.setRows || []) {
        durationSec += estimateSetRowDurationSec(step, row)
      }
    }
  }

  return {
    blockCount: normalizedBlocks.length,
    exerciseCount,
    totalSets,
    durationSec
  }
}
