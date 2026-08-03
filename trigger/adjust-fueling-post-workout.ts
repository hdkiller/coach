import { task } from '@trigger.dev/sdk/v3'
import { prisma } from '../server/utils/db'
import { getUserLocalDate, getUserTimezone } from '../server/utils/date'
import { nutritionRepository } from '../server/utils/repositories/nutritionRepository'
import { workoutRepository } from '../server/utils/repositories/workoutRepository'
import type {
  SerializedFuelingPlan,
  SerializedFuelingWindow
} from '../server/utils/nutrition-domain'

/** Fallback FTP (watts) used when the athlete has not set one, matching metabolicService's default. */
const DEFAULT_FTP_WATTS = 250
/** Fallback intensity factor (0-1) used when a planned workout has no recorded IF. */
const DEFAULT_INTENSITY_FACTOR = 0.65

const BOOST_CARBS_G = 30
const BOOST_PROTEIN_G = 10

/**
 * Estimates the energy cost (kJ) of a planned session from FTP-based training load.
 *
 * Watts * seconds = joules, so `ftp * intensityFactor` approximates the average power for the
 * session (a normalized-power proxy) and multiplying by duration then dividing by 1000 converts to
 * kilojoules. This mirrors how `actualKj` is measured from real power-meter data so the two values
 * are directly comparable (the previous `durationSec * workIntensity * 60` formula overestimated
 * planned energy by roughly two orders of magnitude).
 */
export function calculatePlannedEnergyKj(
  ftpWatts: number,
  intensityFactor: number,
  durationSec: number
): number {
  return (ftpWatts * intensityFactor * durationSec) / 1000
}

/**
 * Returns a copy of the recovery window with the post-workout boost applied.
 *
 * `description` is always populated by the plan generator, so the boost note is appended there.
 * `advice` is optional and, elsewhere in the codebase, callers fall back to `description` when it
 * is unset — so this always assigns `advice` a complete, self-contained sentence instead of
 * concatenating onto a possibly-undefined value (which previously produced literal "undefined"
 * text in the window's advice).
 */
export function buildBoostedRecoveryWindow(
  window: SerializedFuelingWindow,
  boost: { carbs: number; protein: number } = { carbs: BOOST_CARBS_G, protein: BOOST_PROTEIN_G }
): SerializedFuelingWindow {
  const boostNote = `Boosted by +${boost.carbs}g carbs / +${boost.protein}g protein — that session ran harder than planned.`

  return {
    ...window,
    targetCarbs: window.targetCarbs + boost.carbs,
    targetProtein: window.targetProtein + boost.protein,
    description: window.description ? `${window.description} ${boostNote}` : boostNote,
    advice: boostNote,
    status: 'PENDING'
  }
}

/**
 * Picks the recovery window that belongs to the session that was just completed.
 *
 * A day can hold more than one post-workout window, so taking the first would boost the morning
 * recovery meal after a hard evening session. Windows record which sessions they serve; when that
 * is unavailable (older plans, or a completed workout the plan does not know about) the window
 * starting closest to the end of the session is the best available guess.
 */
export function findRecoveryWindowIndex(
  plan: SerializedFuelingPlan,
  session: { workoutId: string; plannedWorkoutId?: string | null; endedAt: Date }
): number {
  const windows = Array.isArray(plan?.windows) ? plan.windows : []
  const candidates = windows
    .map((window, index) => ({ window, index }))
    .filter((entry) => entry.window.type === 'POST_WORKOUT')

  if (candidates.length === 0) return -1
  if (candidates.length === 1) return candidates[0]!.index

  const ids = [session.workoutId, session.plannedWorkoutId].filter(Boolean) as string[]
  const byId = candidates.find((entry) => {
    const owned = Array.isArray(entry.window.plannedWorkoutIds)
      ? entry.window.plannedWorkoutIds
      : []
    return (
      owned.some((id) => ids.includes(id)) ||
      (entry.window.plannedWorkoutId ? ids.includes(entry.window.plannedWorkoutId) : false)
    )
  })
  if (byId) return byId.index

  const endedAt = session.endedAt.getTime()
  const nearest = candidates.reduce((best, entry) => {
    const distance = Math.abs(new Date(entry.window.startTime).getTime() - endedAt)
    const bestDistance = Math.abs(new Date(best.window.startTime).getTime() - endedAt)
    return distance < bestDistance ? entry : best
  })

  return nearest.index
}

export const adjustFuelingPostWorkoutTask = task({
  id: 'adjust-fueling-post-workout',
  run: async (payload: { workoutId: string; userId: string }) => {
    const { workoutId, userId } = payload

    // 1. Fetch Workout
    const workout = await workoutRepository.getById(workoutId, userId, {
      include: { plannedWorkout: true }
    })

    if (!workout) {
      console.log(`Workout ${workoutId} not found. Skipping.`)
      return
    }

    // No planned workout attached? Can't compare delta. Skip for now.
    // Or maybe check if there *was* a planned workout that wasn't linked?
    if (!workout.plannedWorkout) {
      console.log(`Workout ${workoutId} has no linked PlannedWorkout. Skipping delta check.`)
      return
    }

    const planned = workout.plannedWorkout
    const actualKj = workout.kilojoules || 0

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { ftp: true }
    })
    const ftp = user?.ftp || DEFAULT_FTP_WATTS
    const intensityFactor = planned.workIntensity ?? DEFAULT_INTENSITY_FACTOR
    const plannedKj = calculatePlannedEnergyKj(ftp, intensityFactor, planned.durationSec || 0)

    // Calculate Delta
    const kjThreshold = (plannedKj || 1000) * 1.1 // 10% more
    const isHarder = actualKj > kjThreshold

    if (!isHarder) {
      console.log(
        `Workout was not significantly harder (${actualKj} vs ${plannedKj}). No adjustment needed.`
      )
      return
    }

    console.log(`Workout was harder! Triggering recovery boost.`)

    // 2. Fetch Nutrition Plan
    const timezone = await getUserTimezone(userId)
    const date = getUserLocalDate(timezone, workout.date)
    const nutrition = await nutritionRepository.getByDate(userId, date)

    if (!nutrition || !nutrition.fuelingPlan) {
      console.log(`No nutrition plan found for ${date}. Skipping.`)
      return
    }

    // 3. Update Plan
    const plan = nutrition.fuelingPlan as unknown as SerializedFuelingPlan
    const postWindowIndex = findRecoveryWindowIndex(plan, {
      workoutId,
      plannedWorkoutId: planned.id,
      endedAt: new Date(workout.date.getTime() + (workout.durationSec || 0) * 1000)
    })

    if (postWindowIndex === -1) {
      // Add a post-workout window if missing?
      console.log('No POST_WORKOUT window found to boost.')
      return
    }

    // Boost Recovery: +30g Carbs and +10g Protein
    const currentWindow = plan.windows[postWindowIndex]
    const newWindow = buildBoostedRecoveryWindow(currentWindow)

    plan.windows[postWindowIndex] = newWindow
    plan.dailyTotals.carbs += BOOST_CARBS_G
    plan.dailyTotals.protein += BOOST_PROTEIN_G

    // 4. Save
    await nutritionRepository.update(nutrition.id, {
      fuelingPlan: plan as any,
      carbsGoal: plan.dailyTotals.carbs,
      proteinGoal: plan.dailyTotals.protein
    })

    // 5. Notify (Todo: Push Notification or Chat Message)
    // await sendSystemMessage(userId, "Hard ride! We bumped your recovery targets.")

    return {
      success: true,
      adjusted: true,
      deltaKj: actualKj - plannedKj
    }
  }
})
