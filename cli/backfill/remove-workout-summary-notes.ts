import { Command } from 'commander'
import chalk from 'chalk'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { updateIntervalsActivityDescription } from '../../server/utils/intervals'
import {
  hasWorkoutSummaryBlock,
  removeWorkoutSummaryBlock
} from '../../server/utils/services/workout-summary-publish'

function isBenignLocalWriteFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)

  return (
    message.includes('does not exist in the current database') ||
    message.includes('The column `(not available)` does not exist')
  )
}

const removeWorkoutSummaryNotesCommand = new Command('remove-workout-summary-notes')

removeWorkoutSummaryNotesCommand
  .description('Remove CoachWatts AI workout summary blocks from Intervals activity notes')
  .option('--prod', 'Use production database')
  .option('--dry-run', 'Run without saving changes', false)
  .option('--estimate-only', 'Only estimate affected workouts; do not publish', false)
  .option('--days <number>', 'Only include workouts from the last N days')
  .option('--delay-ms <number>', 'Delay in milliseconds between publish calls', '0')
  .option('--users-limit <number>', 'Maximum users to process', '50')
  .option('--workouts-per-user <number>', 'Most recent workouts per user to scan', '50')
  .option('--email <email>', 'Only process one user by email')
  .option('--user-id <id>', 'Only process one user by ID')
  .option('--disable-setting', 'Disable updateWorkoutNotesEnabled for matched users', false)
  .action(async (options) => {
    const isProd = Boolean(options.prod)
    const isDryRun = Boolean(options.dryRun)
    const estimateOnly = Boolean(options.estimateOnly)
    const usersLimit = Number.parseInt(options.usersLimit, 10)
    const workoutsPerUser = Number.parseInt(options.workoutsPerUser, 10)
    const delayMs = Number.parseInt(options.delayMs, 10)
    const days = options.days ? Number.parseInt(options.days, 10) : null
    const email = options.email as string | undefined
    const userId = options.userId as string | undefined
    const disableSetting = Boolean(options.disableSetting)

    if (!Number.isFinite(usersLimit) || usersLimit < 0) {
      console.error(chalk.red('Invalid --users-limit. Use a non-negative number (0 = all users).'))
      process.exit(1)
    }

    if (!Number.isFinite(workoutsPerUser) || workoutsPerUser <= 0) {
      console.error(chalk.red('Invalid --workouts-per-user. Use a positive number.'))
      process.exit(1)
    }

    if (!Number.isFinite(delayMs) || delayMs < 0) {
      console.error(chalk.red('Invalid --delay-ms. Use 0 or a positive number.'))
      process.exit(1)
    }

    if (days !== null && (!Number.isFinite(days) || days <= 0)) {
      console.error(chalk.red('Invalid --days. Use a positive number.'))
      process.exit(1)
    }

    if (email && userId) {
      console.error(chalk.red('Use either --email or --user-id, not both.'))
      process.exit(1)
    }

    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL
    if (!connectionString) {
      console.error(
        chalk.red(isProd ? 'DATABASE_URL_PROD is not defined.' : 'DATABASE_URL is not defined.')
      )
      process.exit(1)
    }

    if (isProd) console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))
    else console.log(chalk.blue('Using DEVELOPMENT database.'))

    if (estimateOnly) {
      console.log(chalk.cyan('📊 ESTIMATE ONLY mode enabled. No changes will be made.'))
    } else if (isDryRun) {
      console.log(chalk.cyan('🔍 DRY RUN mode enabled. No changes will be saved.'))
    }

    if (days !== null) {
      console.log(chalk.gray(`Filtering workouts to last ${days} day(s).`))
    }

    if (disableSetting) {
      console.log(chalk.gray('Matched users will have Update Workout Notes disabled.'))
    }

    if (!estimateOnly && !isDryRun && delayMs > 0) {
      console.log(chalk.gray(`Using ${delayMs}ms delay between publish calls.`))
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      const users = await prisma.user.findMany({
        where: {
          ...(email ? { email } : {}),
          ...(userId ? { id: userId } : {}),
          integrations: {
            some: { provider: 'intervals' }
          }
        },
        select: {
          id: true,
          email: true,
          updateWorkoutNotesEnabled: true
        },
        orderBy: { updatedAt: 'desc' },
        ...(email || userId || usersLimit > 0 ? { take: email || userId ? 1 : usersLimit } : {})
      })

      if (users.length === 0) {
        console.log(chalk.yellow('No eligible users found.'))
        return
      }

      let usersProcessed = 0
      let workoutsScanned = 0
      let workoutsWouldClean = 0
      let workoutsCleaned = 0
      let workoutsSkipped = 0
      let workoutsErrored = 0
      let settingsDisabled = 0
      let localMirrorWarnings = 0

      for (const user of users) {
        const integration = await prisma.integration.findFirst({
          where: { userId: user.id, provider: 'intervals' }
        })

        if (!integration) {
          console.log(chalk.gray(`Skipping ${user.email} (Intervals integration missing)`))
          continue
        }

        if (disableSetting && user.updateWorkoutNotesEnabled !== false) {
          if (!estimateOnly && !isDryRun) {
            await prisma.user.update({
              where: { id: user.id },
              data: { updateWorkoutNotesEnabled: false }
            })
          }
          settingsDisabled++
        }

        const workouts = await prisma.workout.findMany({
          where: {
            userId: user.id,
            source: 'intervals',
            isDuplicate: false,
            description: { not: null },
            ...(days !== null
              ? { date: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } }
              : {})
          },
          orderBy: { date: 'desc' },
          take: workoutsPerUser,
          select: {
            id: true,
            title: true,
            date: true,
            externalId: true,
            description: true
          }
        })

        usersProcessed++
        console.log(chalk.bold(`\nUser: ${user.email} (${workouts.length} workouts)`))

        for (const workout of workouts) {
          workoutsScanned++

          if (!hasWorkoutSummaryBlock(workout.description)) {
            workoutsSkipped++
            console.log(chalk.gray(`  - Skip "${workout.title}" (no CoachWatts summary block)`))
            continue
          }

          const cleanedDescription = removeWorkoutSummaryBlock(workout.description)
          workoutsWouldClean++

          if (estimateOnly) {
            console.log(chalk.green(`  - [ESTIMATE] Would clean "${workout.title}"`))
            continue
          }

          if (isDryRun) {
            console.log(chalk.green(`  - [DRY RUN] Would clean "${workout.title}"`))
            continue
          }

          try {
            if (delayMs > 0) {
              await new Promise((resolve) => setTimeout(resolve, delayMs))
            }

            await updateIntervalsActivityDescription(
              integration,
              workout.externalId,
              cleanedDescription
            )

            workoutsCleaned++

            try {
              await prisma.workout.update({
                where: { id: workout.id },
                data: { description: cleanedDescription }
              })

              console.log(chalk.green(`  - Cleaned "${workout.title}"`))
            } catch (error: any) {
              if (!isBenignLocalWriteFailure(error)) {
                throw error
              }

              localMirrorWarnings++
              console.log(
                chalk.yellow(
                  `  - Cleaned "${workout.title}" on Intervals. Local workout mirror update was skipped: ${error?.message || 'unknown error'}`
                )
              )
            }
          } catch (error: any) {
            workoutsErrored++
            console.log(
              chalk.red(`  - Error "${workout.title}": ${error?.message || 'unknown error'}`)
            )
          }
        }
      }

      console.log(chalk.bold('\nSummary'))
      console.log(`Users processed:   ${usersProcessed}`)
      console.log(`Workouts scanned:  ${workoutsScanned}`)
      console.log(`Would clean:       ${workoutsWouldClean}`)
      console.log(`Cleaned:           ${workoutsCleaned}`)
      console.log(`Skipped:           ${workoutsSkipped}`)
      console.log(`Errors:            ${workoutsErrored}`)
      console.log(`Settings disabled: ${settingsDisabled}`)
      console.log(`Local warnings:    ${localMirrorWarnings}`)

      if (estimateOnly) {
        console.log(
          chalk.cyan('\nEstimate complete. Re-run without --estimate-only to apply changes.')
        )
      } else if (isDryRun) {
        console.log(chalk.cyan('\nRun without --dry-run to apply changes.'))
      }
    } catch (error: any) {
      console.error(chalk.red('Cleanup failed:'), error?.message || error)
      process.exitCode = 1
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default removeWorkoutSummaryNotesCommand
