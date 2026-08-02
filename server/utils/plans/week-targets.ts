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

export interface WeekTargetOptions {
  blockType: string
  /** 1-based week number within the block. */
  weekNumber: number
  blockDurationWeeks: number
  isRecovery: boolean
  /** Weekly loading volume in minutes (athlete's wizard choice or derived). */
  baseVolumeMinutes?: number | null
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
