/**
 * Validation and deterministic clamping for AI-generated training block weeks.
 *
 * The block generator prompts Gemini with per-week volume targets, but the model
 * sometimes schedules far more than requested (e.g. filling every availability
 * slot every day). These helpers verify the generated schedule against the
 * wizard-defined week targets and, as a last resort, scale it down so a week can
 * never be persisted at a multiple of what the athlete asked for. (CW-316)
 */

export interface GeneratedBlockWorkout {
  dayOfWeek: number
  title?: string
  description?: string
  type: string
  durationMinutes?: number
  tssEstimate?: number
  intensity?: string
}

export interface GeneratedBlockWeek {
  weekNumber: number
  focus_key?: string
  focus_label?: string
  explanation?: string
  volumeTargetMinutes?: number
  workouts?: GeneratedBlockWorkout[]
}

export interface WeekVolumeTarget {
  weekNumber: number
  volumeTargetMinutes: number | null
  isRecovery?: boolean
  /** UTC days (0=Sun..6=Sat) that can actually receive workouts. When set, workouts on other days are ignored (they are dropped at insert time anyway). */
  allowedDaysOfWeek?: number[]
}

export interface BlockVolumeViolation {
  weekNumber: number
  kind: 'over_volume' | 'invalid_duration'
  message: string
}

/** A week is rejected when its scheduled minutes exceed target * VOLUME_TOLERANCE. */
export const VOLUME_TOLERANCE = 1.2
/** When clamping, scale down to target * CLAMP_RATIO. */
export const CLAMP_RATIO = 1.1
export const MIN_WORKOUT_MINUTES = 15
export const MAX_WORKOUT_MINUTES = 420

const REST_TYPES = new Set(['Rest'])

function isRest(workout: GeneratedBlockWorkout): boolean {
  return REST_TYPES.has(workout.type)
}

function countsForWeek(workout: GeneratedBlockWorkout, target: WeekVolumeTarget): boolean {
  if (isRest(workout)) return false
  if (target.allowedDaysOfWeek && !target.allowedDaysOfWeek.includes(workout.dayOfWeek)) {
    return false
  }
  return true
}

export function weekScheduledMinutes(week: GeneratedBlockWeek, target: WeekVolumeTarget): number {
  return (week.workouts || [])
    .filter((w) => countsForWeek(w, target))
    .reduce((sum, w) => sum + (w.durationMinutes || 0), 0)
}

export function validateGeneratedBlockWeeks(
  weeks: GeneratedBlockWeek[],
  targets: WeekVolumeTarget[]
): BlockVolumeViolation[] {
  const violations: BlockVolumeViolation[] = []

  for (const week of weeks) {
    const target = targets.find((t) => t.weekNumber === Number(week.weekNumber))
    if (!target) continue

    for (const workout of week.workouts || []) {
      if (!countsForWeek(workout, target)) continue
      const minutes = workout.durationMinutes || 0
      if (minutes < MIN_WORKOUT_MINUTES || minutes > MAX_WORKOUT_MINUTES) {
        violations.push({
          weekNumber: week.weekNumber,
          kind: 'invalid_duration',
          message: `Week ${week.weekNumber}: "${workout.title || workout.type}" has an implausible duration of ${minutes} minutes (must be ${MIN_WORKOUT_MINUTES}-${MAX_WORKOUT_MINUTES} for a non-Rest session).`
        })
      }
    }

    if (!target.volumeTargetMinutes || target.volumeTargetMinutes <= 0) continue

    const scheduled = weekScheduledMinutes(week, target)
    if (scheduled > target.volumeTargetMinutes * VOLUME_TOLERANCE) {
      violations.push({
        weekNumber: week.weekNumber,
        kind: 'over_volume',
        message: `Week ${week.weekNumber}${target.isRecovery ? ' (RECOVERY week)' : ''}: scheduled ${scheduled} minutes but the volume target is ${target.volumeTargetMinutes} minutes. Reduce total scheduled time to within ±10% of the target — do not fill every availability slot.`
      })
    }
  }

  return violations
}

export function formatViolationsFeedback(violations: BlockVolumeViolation[]): string {
  return [
    'YOUR PREVIOUS RESPONSE WAS REJECTED FOR THE FOLLOWING VOLUME VIOLATIONS:',
    ...violations.map((v) => `- ${v.message}`),
    '',
    "Regenerate the FULL block fixing every violation. The weekly volume targets are hard budgets: the sum of workout durations in each week MUST stay within ±10% of that week's target. Availability slots are windows when the athlete CAN train — schedule only as many sessions as the volume budget allows, never one per slot per day."
  ].join('\n')
}

/**
 * Deterministic fallback when the AI ignores corrective feedback: clamp
 * implausible durations and proportionally scale down over-volume weeks
 * (durations and TSS together) to target * CLAMP_RATIO.
 * Mutates nothing; returns new week objects plus a log of adjustments.
 */
export function clampGeneratedBlockWeeks(
  weeks: GeneratedBlockWeek[],
  targets: WeekVolumeTarget[]
): { weeks: GeneratedBlockWeek[]; adjustments: string[] } {
  const adjustments: string[] = []

  const clamped = weeks.map((week) => {
    const target = targets.find((t) => t.weekNumber === Number(week.weekNumber))
    if (!target) return week

    let workouts = (week.workouts || []).map((w) => {
      if (!countsForWeek(w, target)) return w
      const minutes = w.durationMinutes || 0
      if (minutes < MIN_WORKOUT_MINUTES || minutes > MAX_WORKOUT_MINUTES) {
        const fixed = Math.min(Math.max(minutes, MIN_WORKOUT_MINUTES), MAX_WORKOUT_MINUTES)
        adjustments.push(
          `Week ${week.weekNumber}: "${w.title || w.type}" duration ${minutes}min -> ${fixed}min`
        )
        return { ...w, durationMinutes: fixed }
      }
      return w
    })

    if (target.volumeTargetMinutes && target.volumeTargetMinutes > 0) {
      const scheduled = workouts
        .filter((w) => countsForWeek(w, target))
        .reduce((sum, w) => sum + (w.durationMinutes || 0), 0)

      if (scheduled > target.volumeTargetMinutes * VOLUME_TOLERANCE) {
        const factor = (target.volumeTargetMinutes * CLAMP_RATIO) / scheduled
        workouts = workouts.map((w) => {
          if (!countsForWeek(w, target)) return w
          const minutes = w.durationMinutes || 0
          const scaledMinutes = Math.max(
            MIN_WORKOUT_MINUTES,
            Math.round((minutes * factor) / 5) * 5
          )
          const scaled: GeneratedBlockWorkout = { ...w, durationMinutes: scaledMinutes }
          if (typeof w.tssEstimate === 'number') {
            scaled.tssEstimate = Math.round(w.tssEstimate * factor)
          }
          return scaled
        })
        adjustments.push(
          `Week ${week.weekNumber}: scaled ${scheduled}min down to ~${Math.round(target.volumeTargetMinutes * CLAMP_RATIO)}min (target ${target.volumeTargetMinutes}min)`
        )
      }
    }

    return { ...week, workouts }
  })

  return { weeks: clamped, adjustments }
}
