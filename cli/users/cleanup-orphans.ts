import { Command } from 'commander'
import chalk from 'chalk'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import {
  deleteIntervalsPlannedWorkout,
  fetchIntervalsPlannedWorkouts
} from '../../server/utils/intervals'

const cleanupOrphansCommand = new Command('cleanup-orphans')
  .description('Cleanup orphaned CoachWatts workouts for a specific user')
  .argument('<userId>', 'The ID of the user')
  .option('--prod', 'Use production database')
  .option('--dry-run', 'List orphans without deleting')
  .action(async (userId, options) => {
    const isProd = options.prod
    const dryRun = options.dryRun
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (!connectionString) {
      console.error(chalk.red('Error: Database connection string is not defined.'))
      process.exit(1)
    }

    if (isProd) console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))
    if (dryRun) console.log(chalk.cyan('🔍 DRY RUN - No deletions will be performed.'))

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      // 1. Verify user
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        console.error(chalk.red(`User ${userId} not found.`))
        return
      }

      console.log(chalk.blue(`Cleaning up orphans for: ${user.name || user.email} (${user.id})`))

      // 2. Identify active plan week IDs
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
      console.log(chalk.gray(`User has ${activeWeekIds.length} weeks in active plans.`))

      // 3. Find local orphaned workouts
      const now = new Date()
      const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

      const localOrphans = await prisma.plannedWorkout.findMany({
        where: {
          userId,
          managedBy: 'COACH_WATTS',
          OR: [
            {
              trainingWeekId: null,
              date: { lt: todayUTC }
            },
            {
              trainingWeekId: { notIn: activeWeekIds, not: null }
            }
          ]
        },
        select: { id: true, externalId: true, date: true, title: true }
      })

      const futureNoWeekOrphans = await prisma.plannedWorkout.findMany({
        where: {
          userId,
          managedBy: 'COACH_WATTS',
          trainingWeekId: null,
          date: { gt: todayUTC }
        },
        select: { id: true, externalId: true, date: true, title: true }
      })

      const allOrphans = [...localOrphans, ...futureNoWeekOrphans]
      console.log(chalk.yellow(`Found ${allOrphans.length} orphaned workouts in local DB.`))

      // 4. Remote Cleanup (Deep Scan)
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
        console.log(chalk.blue('Scanning Intervals.icu for remote orphans...'))
        try {
          const startDate = new Date(todayUTC)
          startDate.setDate(startDate.getDate() - 30) // check 30 days back
          const endDate = new Date(todayUTC)
          endDate.setDate(endDate.getDate() + 365) // check 1 year ahead

          const remoteWorkouts = await fetchIntervalsPlannedWorkouts(
            integration,
            startDate,
            endDate
          )
          const remoteCWWorouts = remoteWorkouts.filter(
            (rw) => rw.description && rw.description.includes('[CoachWatts]')
          )

          console.log(
            chalk.gray(`Found ${remoteCWWorouts.length} [CoachWatts] workouts on Intervals.icu.`)
          )

          for (const rw of remoteCWWorouts) {
            const externalId = String(rw.id)
            const localWorkout = await prisma.plannedWorkout.findUnique({
              where: { userId_externalId: { userId, externalId } },
              select: { id: true, trainingWeekId: true, date: true }
            })

            let shouldDelete = false
            if (!localWorkout) {
              const workoutDateUTC = new Date(rw.start_date_local.split('T')[0] + 'T00:00:00Z')
              if (workoutDateUTC.getTime() !== todayUTC.getTime()) {
                shouldDelete = true
              }
            } else if (
              !localWorkout.trainingWeekId ||
              !activeWeekIds.includes(localWorkout.trainingWeekId)
            ) {
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
              console.log(
                chalk.red(
                  `[ORPHAN] Remote ID: ${externalId} | Title: ${rw.name} | Date: ${rw.start_date_local.split('T')[0]}`
                )
              )
              if (!dryRun) {
                try {
                  await deleteIntervalsPlannedWorkout(integration, externalId)
                  remoteDeleteCount++
                } catch (err) {
                  console.error(chalk.red(`Failed to delete remote orphan ${externalId}`), err)
                }
              }
            }
          }
        } catch (error) {
          console.error(chalk.red('Remote cleanup failed:'), error)
        }
      } else {
        console.log(chalk.gray('No Intervals integration found for user.'))
      }

      // 5. Local Deletion
      if (!dryRun) {
        const finalIds = Array.from(deletedLocalIds)
        if (finalIds.length > 0) {
          const deleteResult = await prisma.plannedWorkout.deleteMany({
            where: { id: { in: finalIds } }
          })
          console.log(
            chalk.green(`Successfully deleted ${deleteResult.count} local orphaned workouts.`)
          )
        } else {
          console.log(chalk.green('No local orphaned workouts to delete.'))
        }
        console.log(chalk.green(`Remote orphans removed: ${remoteDeleteCount}`))
      } else {
        console.log(chalk.cyan(`\nTotal local orphans to be deleted: ${deletedLocalIds.size}`))
      }
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default cleanupOrphansCommand
