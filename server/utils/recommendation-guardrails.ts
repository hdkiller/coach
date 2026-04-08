type WorkoutPromptSnapshot = {
  id?: string | null
  date?: Date | string | null
  title?: string | null
  type?: string | null
  description?: string | null
  durationSec?: number | null
  tss?: number | null
  updatedAt?: Date | string | null
  completed?: boolean | null
  completionStatus?: string | null
  completedWorkouts?: Array<unknown> | null
}

function normalizeDate(value: Date | string | null | undefined): string | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export function buildCalendarSourceOfTruthPrompt(workouts: WorkoutPromptSnapshot[]) {
  const scheduledCount = workouts.length

  return `
CALENDAR SOURCE OF TRUTH:
- The actual planned workouts listed in this prompt are the only source of truth for what is scheduled.
- Goals, athlete profile commentary, old recommendations, and event categories are NOT scheduled workouts.
- If those other sources mention VO2, threshold, anaerobic work, or another intensity that is NOT present in the planned workouts, describe it only as a goal, theme, or future possibility.
- There ${scheduledCount === 1 ? 'is' : 'are'} ${scheduledCount} planned workout${scheduledCount === 1 ? '' : 's'} listed in this prompt. Rely only on those entries when referring to what is actually booked.
- Never describe a future workout as booked unless it appears in the planned workouts list above.
`
}

export const ATHLETE_AUTONOMY_PROMPT_BLOCK = `
ATHLETE AUTONOMY & CONSENT:
- You are analyzing and suggesting. You do not have authority to change the athlete's calendar or current activity.
- Never say that a ride, tour, or workout has been aborted, cancelled, stopped, or overwritten unless the prompt explicitly states the athlete already approved and applied that change.
- If reducing, skipping, or shortening today's workload seems wise, present it as a proposal the athlete may choose.
`

export type RecommendationTargetSnapshot = {
  id: string
  date: string | null
  title: string | null
  type: string | null
  durationSec: number | null
  tss: number | null
  updatedAt: string | null
}

export function buildRecommendationTargetSnapshot(
  workout: WorkoutPromptSnapshot | null | undefined
): RecommendationTargetSnapshot | null {
  if (!workout?.id) return null

  return {
    id: workout.id,
    date: normalizeDate(workout.date),
    title: workout.title ?? null,
    type: workout.type ?? null,
    durationSec: workout.durationSec ?? null,
    tss: workout.tss ?? null,
    updatedAt: normalizeDate(workout.updatedAt)
  }
}

export function attachRecommendationGuardrails(
  analysis: Record<string, unknown>,
  primaryWorkout: WorkoutPromptSnapshot | null | undefined,
  plannedWorkouts: WorkoutPromptSnapshot[]
) {
  return {
    ...analysis,
    guardrails: {
      calendarSourceOfTruth: true,
      consentRequiredForWorkoutMutation: true,
      targetPlannedWorkout: buildRecommendationTargetSnapshot(primaryWorkout),
      plannedWorkoutCandidateCount: plannedWorkouts.length
    }
  }
}

type AcceptanceValidationInput = {
  recommendationDate: Date | string
  currentWorkout: WorkoutPromptSnapshot | null | undefined
  targetSnapshot: RecommendationTargetSnapshot | null | undefined
  activeWorkoutCountForDate: number
}

export function validateRecommendationAcceptanceTarget({
  currentWorkout,
  targetSnapshot,
  activeWorkoutCountForDate
}: AcceptanceValidationInput) {
  if (!currentWorkout?.id || !targetSnapshot?.id) {
    return {
      ok: false as const,
      message:
        'This recommendation no longer has a safe workout target. Refresh today’s guidance before applying changes.'
    }
  }

  const isCompleted =
    currentWorkout.completed ||
    currentWorkout.completionStatus === 'COMPLETED' ||
    (currentWorkout.completedWorkouts?.length || 0) > 0

  if (isCompleted) {
    return {
      ok: false as const,
      message:
        'This recommendation targets a workout that is already completed. Refresh today’s guidance before applying changes.'
    }
  }

  if (activeWorkoutCountForDate > 1) {
    return {
      ok: false as const,
      message:
        'This day now has multiple planned workouts, so the recommendation target is ambiguous. Refresh today’s guidance before applying changes.'
    }
  }

  if (currentWorkout.id !== targetSnapshot.id) {
    return {
      ok: false as const,
      message:
        'This recommendation no longer points at the same workout it was generated for. Refresh today’s guidance before applying changes.'
    }
  }

  const currentUpdatedAt = normalizeDate(currentWorkout.updatedAt)
  if (
    targetSnapshot.updatedAt &&
    currentUpdatedAt &&
    targetSnapshot.updatedAt !== currentUpdatedAt
  ) {
    return {
      ok: false as const,
      message:
        'That workout changed after this recommendation was generated. Refresh today’s guidance before applying changes.'
    }
  }

  return { ok: true as const }
}
