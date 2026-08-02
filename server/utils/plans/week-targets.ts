/**
 * Shared computation of TrainingWeek volume/TSS targets.
 *
 * Historically the plan wizard (initialize endpoint) had the full logic inline
 * (volumeHours, recovery reduction, taper factor) while every other call site
 * (structure replan, add block, extend block) used a stripped-down helper that
 * ignored the athlete's chosen volume and always reset new weeks to the 450min
 * default. This module is the single source of truth for all of them. (CW-318)
 */

export const DEFAULT_WEEKLY_VOLUME_MINUTES = 450
export const LOW_WEEKLY_VOLUME_MINUTES = 240
export const HIGH_WEEKLY_VOLUME_MINUTES = 600
export const RECOVERY_WEEK_FACTOR = 0.6
/** Heuristic TSS per hour used for week targets across the app. */
export const TSS_PER_HOUR = 50

/**
 * Ramp-rate cap (CW-320): a brand-new plan must not prescribe a multiple of
 * what the athlete has actually been training. Week 1's loading volume is
 * capped at recent 4-week average x RAMP_BASE_MULTIPLIER (with an absolute
 * floor so low-history athletes can still start), then the allowance grows
 * RAMP_GROWTH_PER_LOADING_WEEK per loading week until the athlete's chosen
 * volume is reached. The cap only ever lowers targets, never raises them.
 */
export const RAMP_BASE_MULTIPLIER = 1.2
export const RAMP_GROWTH_PER_LOADING_WEEK = 1.1
export const RAMP_FLOOR_MINUTES = 240

export function computeRampBaseMinutes(recentWeeklyAvgMinutes: number): number {
  return Math.round(
    Math.max((recentWeeklyAvgMinutes || 0) * RAMP_BASE_MULTIPLIER, RAMP_FLOOR_MINUTES)
  )
}

export function applyRampCap(
  baseVolumeMinutes: number,
  loadingWeekOrdinal: number,
  rampBaseMinutes?: number | null
): number {
  if (!rampBaseMinutes || rampBaseMinutes <= 0) return baseVolumeMinutes
  const cap = Math.round(
    rampBaseMinutes * Math.pow(RAMP_GROWTH_PER_LOADING_WEEK, Math.max(0, loadingWeekOrdinal - 1))
  )
  return Math.min(baseVolumeMinutes, cap)
}

export interface WeekTargetOptions {
  blockType: string
  /** 1-based week number within the block. */
  weekNumber: number
  blockDurationWeeks: number
  isRecovery: boolean
  /** Weekly loading volume in minutes (athlete's wizard choice or derived). */
  baseVolumeMinutes?: number | null
  /** When set, caps the loading volume by ramp allowance before recovery/taper factors. */
  rampBaseMinutes?: number | null
  /** 1-based count of loading weeks up to and including this week's position. */
  loadingWeekOrdinal?: number
}

export function baseWeeklyVolumeMinutes(
  volumeHours?: number | null,
  volumePreference?: string | null
): number {
  if (volumeHours && volumeHours > 0) return Math.round(volumeHours * 60)
  if (volumePreference === 'LOW') return LOW_WEEKLY_VOLUME_MINUTES
  if (volumePreference === 'HIGH') return HIGH_WEEKLY_VOLUME_MINUTES
  return DEFAULT_WEEKLY_VOLUME_MINUTES
}

/**
 * Recovers the plan's loading-week volume from already-persisted weeks, since
 * TrainingPlan does not store the wizard's volumeHours. The max non-recovery
 * target is the loading volume (recovery/taper weeks are reduced from it).
 */
export function deriveBaseVolumeMinutesFromWeeks(
  weeks: Array<{ volumeTargetMinutes?: number | null; isRecovery?: boolean | null }>
): number | null {
  const loadingTargets = weeks
    .filter((w) => !w.isRecovery && (w.volumeTargetMinutes || 0) > 0)
    .map((w) => w.volumeTargetMinutes!)
  if (loadingTargets.length === 0) return null
  return Math.max(...loadingTargets)
}

/** Standard recovery-week cadence: every Nth week, except in PEAK/RACE blocks. */
export function isRecoveryWeek(
  weekNumber: number,
  recoveryRhythm: number,
  blockType: string
): boolean {
  if (blockType === 'PEAK' || blockType === 'RACE') return false
  return recoveryRhythm > 0 && weekNumber % recoveryRhythm === 0
}

export function calculateWeekTargets(options: WeekTargetOptions): {
  volumeTargetMinutes: number
  tssTarget: number
} {
  let targetMinutes = options.baseVolumeMinutes || DEFAULT_WEEKLY_VOLUME_MINUTES

  if (options.rampBaseMinutes && options.loadingWeekOrdinal) {
    targetMinutes = applyRampCap(targetMinutes, options.loadingWeekOrdinal, options.rampBaseMinutes)
  }

  if (options.isRecovery) {
    targetMinutes = Math.round(targetMinutes * RECOVERY_WEEK_FACTOR)
  }

  if (options.blockType === 'PEAK') {
    // Progressive taper: e.g. 2-week peak block -> week 1 at 75%, week 2 at 50%
    const taperFactor = 1 - (options.weekNumber / options.blockDurationWeeks) * 0.5
    targetMinutes = Math.round(targetMinutes * taperFactor)
  }

  return {
    volumeTargetMinutes: targetMinutes,
    tssTarget: Math.round((targetMinutes / 60) * TSS_PER_HOUR)
  }
}
