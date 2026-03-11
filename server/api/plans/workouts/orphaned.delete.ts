import { prisma } from '../../../utils/db'
import {
  deleteIntervalsPlannedWorkout,
  fetchIntervalsPlannedWorkouts
} from '../../../utils/intervals'
import { getServerSession } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = (session.user as any).id

  // 1. Identify active plan week IDs
  const activeWeeks = await prisma.trainingWeek.findMany({
    where: {
      block: {
        plan: {
          userId,
          status: 'ACTIVE'
        }
      }
    },
    select: { id: true }
  })
  const activeWeekIds = activeWeeks.map((w) => w.id)

  // 2. Find local orphaned workouts
  // Orphaned = trainingWeekId is NULL OR not in activeWeekIds
  // AND managedBy is COACH_WATTS
  // AND NOT a current/future standalone recommendation (trainingWeekId is NULL but it's today or later)
  const now = new Date()
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  const localOrphans = await prisma.plannedWorkout.findMany({
    where: {
      userId,
      managedBy: 'COACH_WATTS',
      OR: [
        {
          trainingWeekId: null,
          date: { lt: todayUTC } // If it's in the past and has no week, it's definitely an orphan
        },
        {
          trainingWeekId: { notIn: activeWeekIds, not: null } // Belongs to a non-active plan
        }
      ]
    },
    select: { id: true, externalId: true, date: true }
  })

  // Also include future ones with no week IF they look like plan-fillers (e.g. part of a deleted plan sequence)
  // Standard standalone recommendations usually only happen for "today".
  // If we have CoachWatts workouts far in the future with no week, they are likely from a deleted plan.
  const futureNoWeekOrphans = await prisma.plannedWorkout.findMany({
    where: {
      userId,
      managedBy: 'COACH_WATTS',
      trainingWeekId: null,
      date: { gt: todayUTC }
    },
    select: { id: true, externalId: true, date: true, title: true }
  })

  // For future ones with no week, we only delete them if they don't look like today's recommendation.
  // Actually, to be safe, let's only delete past ones with no week, OR any that belong to a known non-active plan.
  // If a user has future CoachWatts workouts with no week, they are likely orphans from a deleted plan.
  // But we should keep "today".

  const allOrphans = [...localOrphans]
  for (const f of futureNoWeekOrphans) {
    // If it's tomorrow or later and has no week, it's almost certainly a plan orphan (CoachWatts doesn't pre-recommend standalone future days)
    allOrphans.push(f)
  }

  // 3. Remote Cleanup (Deep Scan)
  const integration = await prisma.integration.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: 'intervals'
      }
    }
  })

  let remoteDeleteCount = 0
  const deletedLocalIds = new Set<string>(allOrphans.map((o) => o.id))

  if (integration) {
    try {
      // Scan 6 months into the future for any [CoachWatts] tagged workouts
      const scanNow = new Date()
      const startDate = new Date(scanNow)
      startDate.setDate(startDate.getDate() - 7) // also check last week just in case
      const endDate = new Date(scanNow)
      endDate.setDate(endDate.getDate() + 180)

      const remoteWorkouts = await fetchIntervalsPlannedWorkouts(integration, startDate, endDate)

      // Identify workouts on Intervals that CoachWatts should manage
      const remoteCWWorouts = remoteWorkouts.filter(
        (rw) => rw.description && rw.description.includes('[CoachWatts]')
      )

      if (remoteCWWorouts.length > 0) {
        // For each remote workout, check if it's "valid" (linked to our active plan)
        await Promise.allSettled(
          remoteCWWorouts.map(async (rw) => {
            const externalId = String(rw.id)

            // Find if we have this workout locally
            const localWorkout = await prisma.plannedWorkout.findUnique({
              where: {
                userId_externalId: {
                  userId,
                  externalId
                }
              },
              select: { id: true, trainingWeekId: true, date: true }
            })

            let shouldDelete = false

            if (!localWorkout) {
              // Not in our DB at all, but tagged with [CoachWatts] -> ORPHAN
              // Exception: Keep if it's today (might be a fresh recommendation not yet synced back)
              const workoutDateUTC = new Date(
                localWorkout?.date || rw.start_date_local.split('T')[0] + 'T00:00:00Z'
              )
              if (workoutDateUTC.getTime() !== todayUTC.getTime()) {
                shouldDelete = true
              }
            } else if (
              !localWorkout.trainingWeekId ||
              !activeWeekIds.includes(localWorkout.trainingWeekId)
            ) {
              // In our DB but not in active plan -> ORPHAN
              // Exception: Keep if it's today and has no week (standalone recommendation)
              if (
                localWorkout.date.getTime() === todayUTC.getTime() &&
                !localWorkout.trainingWeekId
              ) {
                // Keep today's standalone
              } else {
                shouldDelete = true
                deletedLocalIds.add(localWorkout.id)
              }
            }

            if (shouldDelete) {
              try {
                await deleteIntervalsPlannedWorkout(integration, externalId)
                remoteDeleteCount++
              } catch (err) {
                console.error(`Failed to delete remote orphan ${externalId}`, err)
              }
            }
          })
        )
      }
    } catch (error) {
      console.error('Remote cleanup deep scan failed:', error)
      // Non-blocking
    }
  }

  // 4. Final local cleanup for anything identified
  // Combine localOrphans and any new orphans found during remote scan
  const finalLocalDeleteResult = await prisma.plannedWorkout.deleteMany({
    where: {
      id: { in: Array.from(deletedLocalIds) }
    }
  })

  return {
    success: true,
    localCount: finalLocalDeleteResult.count,
    remoteCount: remoteDeleteCount
  }
})
