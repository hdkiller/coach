/**
 * Helper to calculate and update CTL/ATL for new workouts
 * This ensures training stress metrics are always up-to-date
 */

import { prisma } from './db'
import { calculateCTL, calculateATL, getStressScore } from './training-stress'
import { userRepository } from './repositories/userRepository'
import { normalizeTSS } from './normalize-tss'

const verboseWorkoutStressLogs = process.env.CW_VERBOSE_WORKOUT_STRESS_LOGS === '1'

function getIntervalsSourceLoad(workout: {
  source?: string | null
  rawJson?: any
}): { ctl: number; atl: number } | null {
  if (workout.source !== 'intervals') return null

  const ctl = workout?.rawJson?.icu_ctl
  const atl = workout?.rawJson?.icu_atl

  if (typeof ctl !== 'number' || typeof atl !== 'number') return null

  return { ctl, atl }
}

function getAuthoritativeLoad(workout: {
  source?: string | null
  rawJson?: any
  ctl?: number | null
  atl?: number | null
}): { ctl: number; atl: number } | null {
  const intervalsLoad = getIntervalsSourceLoad(workout)
  if (intervalsLoad) return intervalsLoad

  if (workout.ctl === null || workout.ctl === undefined) return null
  if (workout.atl === null || workout.atl === undefined) return null

  return {
    ctl: workout.ctl,
    atl: workout.atl
  }
}

/**
 * Calculate and update CTL/ATL for a new or updated workout
 * Should be called after a workout is created/updated
 */
export async function calculateWorkoutStress(
  workoutId: string,
  userId: string
): Promise<{ ctl: number; atl: number }> {
  // Get the workout
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    select: {
      id: true,
      date: true,
      tss: true,
      trimp: true,
      ctl: true,
      atl: true,
      source: true,
      rawJson: true
    }
  })

  if (!workout) {
    throw new Error(`Workout ${workoutId} not found`)
  }

  const authoritativeLoad = getAuthoritativeLoad(workout)

  // Intervals raw CTL/ATL are the source of truth. If they exist, keep columns aligned to them.
  if (authoritativeLoad) {
    if (workout.ctl !== authoritativeLoad.ctl || workout.atl !== authoritativeLoad.atl) {
      await prisma.workout.update({
        where: { id: workoutId },
        data: authoritativeLoad
      })
    }

    return authoritativeLoad
  }

  // Get the previous workout's CTL/ATL (chronologically before this one)
  const previousWorkout = await prisma.workout.findFirst({
    where: {
      userId,
      date: { lt: workout.date },
      isDuplicate: false,
      OR: [{ ctl: { not: null } }, { atl: { not: null } }]
    },
    orderBy: { date: 'desc' },
    select: { ctl: true, atl: true }
  })

  // Get initial values (0 if no previous workout)
  const previousCTL = previousWorkout?.ctl ?? 0
  const previousATL = previousWorkout?.atl ?? 0

  // Calculate stress score
  let tss = getStressScore(workout)
  if (verboseWorkoutStressLogs) {
    console.log(
      `[calculateWorkoutStress] Workout ${workout.id}: Initial TSS=${tss} (from DB=${workout.tss}, TRIMP=${workout.trimp})`
    )
  }

  if (tss === 0) {
    // If TSS is 0, try to calculate it from streams if available
    // This handles cases where TSS wasn't in the FIT file header but can be derived

    // REFACTOR: Use userRepository to get the FTP correct for THIS workout's date
    const ftp = await userRepository.getFtpForDate(userId, workout.date)
    if (verboseWorkoutStressLogs) {
      console.log(
        `[calculateWorkoutStress] Using FTP ${ftp}W for date ${workout.date.toISOString().split('T')[0]}`
      )
    }

    if (ftp > 0) {
      const workoutWithStreams = await prisma.workout.findUnique({
        where: { id: workoutId },
        include: { streams: true }
      })

      if (
        workoutWithStreams?.streams?.watts &&
        Array.isArray(workoutWithStreams.streams.watts) &&
        workoutWithStreams.streams.watts.length > 0
      ) {
        // Simple TSS calculation: (sec * NP * IF) / (FTP * 3600) * 100
        // Need NP first. For now, let's use Average Power as a rough proxy if NP is missing
        // or re-implement simple NP calculation here
        const watts = workoutWithStreams.streams.watts as number[]
        const avgPower = watts.reduce((a, b) => a + b, 0) / watts.length

        // Simple normalized power approximation (often ~5-10% higher than avg for variable rides)
        // Ideally we'd do the real 30s rolling avg calculation
        const np = (workout as any).normalizedPower || avgPower

        const intensity = np / ftp
        const durationSec = watts.length // assuming 1s recording

        const calculatedTss = ((durationSec * np * intensity) / (ftp * 3600)) * 100
        if (verboseWorkoutStressLogs) {
          console.log(
            `[calculateWorkoutStress] Calculated TSS fallback: ${calculatedTss} (FTP=${ftp}, NP=${np}, IF=${intensity}, Duration=${durationSec})`
          )
        }

        if (calculatedTss > 0) {
          // Update workout with calculated TSS
          await prisma.workout.update({
            where: { id: workoutId },
            data: {
              tss: Math.round(calculatedTss * 10) / 10,
              ftp: ftp // Store the FTP used for calculation!
            }
          })
          // Use this new TSS for CTL/ATL
          tss = Math.round(calculatedTss * 10) / 10
        }
      } else {
        if (verboseWorkoutStressLogs) {
          console.log(`[calculateWorkoutStress] No watts stream available for TSS calculation`)
        }
      }
    } else {
      if (verboseWorkoutStressLogs) {
        console.log(`[calculateWorkoutStress] User ${userId} has no FTP set, cannot calculate TSS`)
      }
    }

    // If still zero, try full normalization pipeline (HR stream, TRIMP, duration estimate).
    if (tss === 0) {
      try {
        const normalized = await normalizeTSS(workoutId, userId, false)
        if (normalized.tss !== null && normalized.tss > 0) {
          tss = normalized.tss
          if (verboseWorkoutStressLogs) {
            console.log(
              `[calculateWorkoutStress] Applied normalizeTSS fallback: ${tss} (source=${normalized.source}, method=${normalized.method})`
            )
          }
        }
      } catch (error) {
        console.error(
          `[calculateWorkoutStress] normalizeTSS fallback failed for workout ${workoutId}:`,
          error
        )
      }
    }
  }

  // Calculate new CTL and ATL
  const ctl = calculateCTL(previousCTL, tss)
  const atl = calculateATL(previousATL, tss)

  // Update the workout
  await prisma.workout.update({
    where: { id: workoutId },
    data: { ctl, atl }
  })

  return { ctl, atl }
}

/**
 * Recalculate CTL/ATL for all workouts after a specific date
 * Useful when a workout is deleted or modified
 */
export async function recalculateStressAfterDate(userId: string, afterDate: Date): Promise<number> {
  // Get the CTL/ATL just before the affected date
  const lastGoodWorkout = await prisma.workout.findFirst({
    where: {
      userId,
      date: { lt: afterDate },
      isDuplicate: false
    },
    orderBy: { date: 'desc' },
    select: { ctl: true, atl: true, source: true, rawJson: true }
  })

  const lastGoodLoad = lastGoodWorkout ? getAuthoritativeLoad(lastGoodWorkout) : null
  let ctl = lastGoodLoad?.ctl ?? 0
  let atl = lastGoodLoad?.atl ?? 0

  // Get all workouts from the affected date onwards
  const workoutsToUpdate = await prisma.workout.findMany({
    where: {
      userId,
      date: { gte: afterDate },
      isDuplicate: false
    },
    orderBy: { date: 'asc' }
  })

  // Recalculate each workout
  for (const workout of workoutsToUpdate) {
    const authoritativeLoad = getAuthoritativeLoad(workout)
    if (authoritativeLoad) {
      ctl = authoritativeLoad.ctl
      atl = authoritativeLoad.atl
    } else {
      const tss = getStressScore(workout)
      ctl = calculateCTL(ctl, tss)
      atl = calculateATL(atl, tss)
    }

    if (workout.ctl !== ctl || workout.atl !== atl) {
      await prisma.workout.update({
        where: { id: workout.id },
        data: { ctl, atl }
      })
    }
  }

  return workoutsToUpdate.length
}
