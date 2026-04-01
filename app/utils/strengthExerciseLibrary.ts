import {
  DEFAULT_LOAD_MODE,
  DEFAULT_PRESCRIPTION_MODE,
  createStrengthBlockStep,
  normalizeStrengthSetRows,
  type StrengthBlockStep,
  type StrengthLoadMode,
  type StrengthPrescriptionMode
} from './strengthWorkout'

export type StrengthLibrarySetRow = {
  id?: string
  index?: number
  value?: string
  loadValue?: string
  restOverride?: string
}

export type StrengthLibraryExercise = {
  id: string
  title: string
  intent?: string
  movementPattern?: string
  targetMuscleGroups?: string[]
  notes?: string
  videoUrl?: string
  sets?: number
  reps?: string
  weight?: string
  duration?: number
  rest?: string
  rpe?: number
  ownerScope?: 'athlete' | 'coach'
  prescriptionMode?: StrengthPrescriptionMode
  loadMode?: StrengthLoadMode
  defaultRest?: string
  setRows?: StrengthLibrarySetRow[]
}

export type StrengthLibraryExercisePayload = {
  title: string
  intent?: string
  movementPattern?: string
  targetMuscleGroups?: string[]
  notes?: string
  videoUrl?: string
  sets?: number
  reps?: string
  weight?: string
  duration?: number
  rest?: string
  rpe?: number
  ownerScope?: 'athlete' | 'coach'
  prescriptionMode?: StrengthPrescriptionMode
  loadMode?: StrengthLoadMode
  defaultRest?: string
  setRows?: StrengthLibrarySetRow[]
}

function parseUrl(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    return new URL(value.trim())
  } catch {
    return null
  }
}

export function extractYouTubeVideoId(value: unknown) {
  const url = parseUrl(value)
  if (!url) return null
  const host = url.hostname.toLowerCase()

  if (host === 'youtu.be') {
    return url.pathname.split('/').filter(Boolean)[0] || null
  }

  if (!['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)) {
    return null
  }

  if (url.pathname === '/watch') {
    return url.searchParams.get('v')
  }

  const parts = url.pathname.split('/').filter(Boolean)
  const embedIndex = parts.findIndex((part) => part === 'embed' || part === 'shorts')
  return embedIndex >= 0 ? parts[embedIndex + 1] || null : null
}

export function normalizeYouTubeUrl(value: unknown) {
  const videoId = extractYouTubeVideoId(value)
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null
}

export function getYouTubeEmbedUrl(value: unknown) {
  const videoId = extractYouTubeVideoId(value)
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null
}

function inferPrescriptionMode(exercise: StrengthLibraryExercise): StrengthPrescriptionMode {
  if (exercise.prescriptionMode) return exercise.prescriptionMode
  if (exercise.duration) return 'duration'
  return exercise.reps?.toLowerCase().includes('/side')
    ? 'reps_per_side'
    : DEFAULT_PRESCRIPTION_MODE
}

function inferLoadMode(exercise: StrengthLibraryExercise): StrengthLoadMode {
  if (exercise.loadMode) return exercise.loadMode
  const normalized = String(exercise.weight || '')
    .trim()
    .toLowerCase()
  if (!normalized) return DEFAULT_LOAD_MODE
  if (normalized.includes('/side') && normalized.includes('lb')) return 'weight_per_side_lb'
  if (normalized.includes('/side') && normalized.includes('kg')) return 'weight_per_side_kg'
  if (normalized.includes('lb')) return 'weight_lb'
  if (normalized.includes('kg')) return 'weight_kg'
  return 'generic'
}

function inferStarterValue(exercise: StrengthLibraryExercise, mode: StrengthPrescriptionMode) {
  if (mode === 'duration') return exercise.duration ? String(exercise.duration) : ''
  if (mode.startsWith('distance_')) return ''
  const reps = String(exercise.reps || '').trim()
  if (!reps) return ''
  return mode === 'reps_per_side' ? reps.replace(/\/side/i, '').trim() || reps : reps
}

export function mapLibraryExerciseToWorkoutStep(
  exercise: StrengthLibraryExercise
): StrengthBlockStep {
  const prescriptionMode = inferPrescriptionMode(exercise)
  const loadMode = inferLoadMode(exercise)
  const setCount = Math.max(Number(exercise.sets || exercise.setRows?.length || 1), 1)
  const starterValue = inferStarterValue(exercise, prescriptionMode)
  const starterLoad = String(exercise.weight || '').trim()

  return createStrengthBlockStep({
    libraryExerciseId: exercise.id,
    name: exercise.title,
    intent: exercise.intent || '',
    movementPattern: exercise.movementPattern || '',
    notes: exercise.notes || '',
    videoUrl: exercise.videoUrl || '',
    prescriptionMode,
    loadMode,
    defaultRest: exercise.defaultRest || exercise.rest || '',
    showRestColumn: Array.isArray(exercise.setRows)
      ? exercise.setRows.some((row) => String(row?.restOverride || '').trim())
      : false,
    setRows: normalizeStrengthSetRows(exercise.setRows, setCount, {
      value: starterValue,
      loadValue: starterLoad,
      restOverride: ''
    })
  })
}
