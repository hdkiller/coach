import { resolveShareTokenAccessMode } from './public-plans'

function pickFields<T extends Record<string, unknown>>(
  source: T,
  keys: readonly (keyof T & string)[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const key of keys) {
    if (key in source) {
      result[key] = source[key]
    }
  }
  return result
}

export function sanitizeSharedNutrition(nutrition: Record<string, unknown>) {
  const {
    userId: _userId,
    rawJson: _rawJson,
    sourcePrecedence: _sourcePrecedence,
    isChainValid: _isChainValid,
    startingGlycogenPercentage: _startingGlycogenPercentage,
    startingFluidDeficit: _startingFluidDeficit,
    endingGlycogenPercentage: _endingGlycogenPercentage,
    endingFluidDeficit: _endingFluidDeficit,
    isManualLock: _isManualLock,
    ...safe
  } = nutrition

  return safe
}

export function sanitizeSharedPlannedWorkout(
  workout: Record<string, unknown>,
  accessMode?: string | null
) {
  const { userId: _userId, ...rest } = workout
  const mode = resolveShareTokenAccessMode(accessMode)

  if (mode === 'FULL') {
    return rest
  }

  const {
    structuredWorkout: _structuredWorkout,
    description: _description,
    shareToken: _shareToken,
    ...preview
  } = rest

  return {
    ...preview,
    previewMode: true
  }
}

/** Fields safe for unauthenticated WELLNESS share pages (metrics + AI summary). */
export function sanitizeSharedWellness(wellness: Record<string, unknown>) {
  const {
    userId: _userId,
    rawJson: _rawJson,
    comments: _comments,
    history: _history,
    lastSource: _lastSource,
    feedback: _feedback,
    feedbackText: _feedbackText,
    customMetrics: _customMetrics,
    aiAnalysis: _aiAnalysis,
    aiAnalysisStatus: _aiAnalysisStatus,
    aiAnalyzedAt: _aiAnalyzedAt,
    // Clinical / sensitive biometrics not shown on the public share page
    bloodGlucose: _bloodGlucose,
    diastolic: _diastolic,
    systolic: _systolic,
    injury: _injury,
    menstrualPhase: _menstrualPhase,
    lactate: _lactate,
    abdomen: _abdomen,
    bodyFat: _bodyFat,
    hydration: _hydration,
    hydrationVolume: _hydrationVolume,
    skinTemp: _skinTemp,
    tags: _tags,
    ...safe
  } = wellness

  return safe
}

const SHARED_REPORT_FIELDS = [
  'id',
  'type',
  'status',
  'createdAt',
  'updatedAt',
  'dateRangeStart',
  'dateRangeEnd',
  'analysisJson',
  'markdown',
  'suggestions',
  'overallScore',
  'trainingLoadScore',
  'recoveryScore',
  'progressScore',
  'consistencyScore',
  'trainingLoadExplanation',
  'recoveryBalanceExplanation',
  'progressTrendExplanation',
  'adaptationReadinessExplanation',
  'injuryRiskExplanation'
] as const

/** Allowlisted REPORT / ATHLETE_PROFILE payload for public share links. */
export function sanitizeSharedReport(report: Record<string, unknown>) {
  return pickFields(report, SHARED_REPORT_FIELDS)
}

const SHARED_PLAN_WORKOUT_FIELDS = [
  'id',
  'date',
  'dayIndex',
  'weekIndex',
  'title',
  'description',
  'type',
  'category',
  'durationSec',
  'distanceMeters',
  'tss',
  'workIntensity',
  'completed',
  'completionStatus',
  'structuredWorkout',
  'targetArea',
  'fuelingStrategy',
  'startTime',
  'trainingWeekId',
  'shareToken'
] as const

function sanitizeSharedPlanWorkout(workout: Record<string, unknown>) {
  return pickFields(workout, SHARED_PLAN_WORKOUT_FIELDS)
}

function sanitizeSharedPlanGoal(goal: unknown) {
  if (!goal || typeof goal !== 'object') return null
  const { title } = goal as Record<string, unknown>
  return title === undefined ? null : { title }
}

/**
 * Sanitize TRAINING_PLAN rows returned by GET /api/share/[token].
 * Primary UI uses /api/public/plans/access/[token]; this path still must not
 * leak userId, private notes, or sync/internal workout fields.
 */
export function sanitizeSharedTrainingPlan(plan: Record<string, unknown>) {
  const {
    userId: _userId,
    teamId: _teamId,
    folderId: _folderId,
    coachNotes: _coachNotes,
    athleteNotes: _athleteNotes,
    customInstructions: _customInstructions,
    fromTemplateId: _fromTemplateId,
    hasBeenSavedAsTemplate: _hasBeenSavedAsTemplate,
    goal,
    blocks,
    ...rest
  } = plan

  const sanitizedBlocks = Array.isArray(blocks)
    ? blocks.map((block) => {
        if (!block || typeof block !== 'object') return block
        const blockRecord = block as Record<string, unknown>
        const weeks = Array.isArray(blockRecord.weeks)
          ? blockRecord.weeks.map((week) => {
              if (!week || typeof week !== 'object') return week
              const weekRecord = week as Record<string, unknown>
              const workouts = Array.isArray(weekRecord.workouts)
                ? weekRecord.workouts.map((workout) =>
                    workout && typeof workout === 'object'
                      ? sanitizeSharedPlanWorkout(workout as Record<string, unknown>)
                      : workout
                  )
                : weekRecord.workouts
              return { ...weekRecord, workouts }
            })
          : blockRecord.weeks
        return { ...blockRecord, weeks }
      })
    : blocks

  return {
    ...rest,
    goal: sanitizeSharedPlanGoal(goal),
    blocks: sanitizedBlocks
  }
}
