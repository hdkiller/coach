import { Command } from 'commander'
import chalk from 'chalk'
import { PrismaClient, Prisma } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { updateIntervalsActivityDescription } from '../../server/utils/intervals'

const SUMMARY_BLOCK_HEADER = 'CoachWatts Workout Analysis'
const SUMMARY_ATTRIBUTION_URL = '🔗 https://CoachWatts.com - AI Endurance Coaching'

function upsertSummaryBlock(
  existingDescription: string | null | undefined,
  summary: string
): string {
  const current = (existingDescription || '').trim()
  const previousBlockPatterns = [
    /\n?\[CoachWatts\.com AI Summary\][\s\S]*?\[\/CoachWatts\.com AI Summary\]\n?/g,
    /\n?\[CoachWatts AI Summary\][\s\S]*?\[\/CoachWatts AI Summary\]\n?/g,
    /\n?\[CoachWatts Workout Analyisis\][\s\S]*?\[\/CoachWatts Workout Analyisis\]\n?/g,
    /\n?\[CoachWatts Workout Analysis\][\s\S]*?\[\/CoachWatts Workout Analysis\]\n?/g,
    /\n?CoachWatts Workout Analyisis[\s\S]*?🔗 https:\/\/CoachWatts\.com - AI Endurance Coaching\n?/g,
    /\n?CoachWatts Workout Analysis[\s\S]*?🔗 https:\/\/CoachWatts\.com - AI Endurance Coaching\n?/g,
    /\n?\[AI Workout Summary\][\s\S]*?\[\/AI Workout Summary\]\n?/g
  ]
  const withoutPreviousSummary = previousBlockPatterns
    .reduce((text, pattern) => text.replace(pattern, ''), current)
    .trim()
  const nextBlock = `${SUMMARY_BLOCK_HEADER}\n\n${summary.trim()}\n\n${SUMMARY_ATTRIBUTION_URL}`

  return withoutPreviousSummary ? `${nextBlock}\n\n${withoutPreviousSummary}` : nextBlock
}

const backfillWorkoutSummaryNotesCommand = new Command('workout-summary-notes')

backfillWorkoutSummaryNotesCommand
  .description('Backfill Intervals workout notes from AI workout summaries')
  .option('--prod', 'Use production database')
  .option('--dry-run', 'Run without saving changes', false)
  .option('--estimate-only', 'Only estimate affected workouts; do not publish', false)
  .option('--days <number>', 'Only include workouts from the last N days')
  .option('--delay-ms <number>', 'Delay in milliseconds between publish calls', '0')
  .option('--users-limit <number>', 'Maximum users to process', '50')
  .option('--workouts-per-user <number>', 'Most recent workouts per user to scan', '5')
  .option('--email <email>', 'Only process one user by email')
  .option(
    '--skip-setting-check',
    'Ignore updateWorkoutNotesEnabled and publish even when disabled',
    false
  )
  .action(async (options) => {
    const isProd = Boolean(options.prod)
    const isDryRun = Boolean(options.dryRun)
    const estimateOnly = Boolean(options.estimateOnly)
    const usersLimit = Number.parseInt(options.usersLimit, 10)
    const workoutsPerUser = Number.parseInt(options.workoutsPerUser, 10)
    const delayMs = Number.parseInt(options.delayMs, 10)
    const days = options.days ? Number.parseInt(options.days, 10) : null
    const email = options.email as string | undefined
    const skipSettingCheck = Boolean(options.skipSettingCheck)

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
    if (!estimateOnly && !isDryRun && delayMs > 0) {
      console.log(chalk.gray(`Using ${delayMs}ms delay between publish calls.`))
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      const columnExistsResult = await prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'User'
            AND column_name = 'updateWorkoutNotesEnabled'
        ) AS "exists"
      `
      const hasUpdateNotesSettingColumn = Boolean(columnExistsResult[0]?.exists)

      const users = await prisma.user.findMany({
        where: {
          ...(email ? { email } : {}),
          integrations: {
            some: { provider: 'intervals' }
          }
        },
        select: {
          id: true,
          email: true,
          ...(hasUpdateNotesSettingColumn ? { updateWorkoutNotesEnabled: true } : {})
        } as any,
        orderBy: { updatedAt: 'desc' },
        ...(email || usersLimit > 0 ? { take: email ? 1 : usersLimit } : {})
      })

      if (users.length === 0) {
        console.log(chalk.yellow('No eligible users found.'))
        return
      }

      let usersProcessed = 0
      let workoutsScanned = 0
      let workoutsWouldPublish = 0
      let workoutsPublished = 0
      let workoutsSkipped = 0
      let workoutsErrored = 0

      for (const user of users) {
        if (
          !skipSettingCheck &&
          hasUpdateNotesSettingColumn &&
          (user as any).updateWorkoutNotesEnabled === false
        ) {
          console.log(chalk.gray(`Skipping ${user.email} (Update Workout Notes disabled)`))
          continue
        }

        const integration = await prisma.integration.findFirst({
          where: { userId: user.id, provider: 'intervals' }
        })

        if (!integration) {
          console.log(chalk.gray(`Skipping ${user.email} (Intervals integration missing)`))
          continue
        }

        const workouts = await prisma.workout.findMany({
          where: {
            userId: user.id,
            source: 'intervals',
            isDuplicate: false,
            aiAnalysisJson: { not: Prisma.JsonNull },
            ...(days !== null ? { date: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } } : {})
          },
          orderBy: { date: 'desc' },
          take: workoutsPerUser,
          select: {
            id: true,
            title: true,
            date: true,
            externalId: true,
            description: true,
            aiAnalysisJson: true
          }
        })

        usersProcessed++
        console.log(chalk.bold(`\nUser: ${user.email} (${workouts.length} workouts)`))

        for (const workout of workouts) {
          workoutsScanned++

          const summary =
            typeof (workout.aiAnalysisJson as any)?.executive_summary === 'string'
              ? ((workout.aiAnalysisJson as any).executive_summary as string).trim()
              : ''

          if (!summary) {
            workoutsSkipped++
            console.log(chalk.gray(`  - Skip "${workout.title}" (no executive_summary)`))
            continue
          }

          const mergedDescription = upsertSummaryBlock(workout.description, summary)
          workoutsWouldPublish++

          if (estimateOnly) {
            console.log(chalk.green(`  - [ESTIMATE] Would publish "${workout.title}"`))
            continue
          }

          if (isDryRun) {
            console.log(chalk.green(`  - [DRY RUN] Would publish "${workout.title}"`))
            continue
          }

          try {
            if (delayMs > 0) {
              await new Promise((resolve) => setTimeout(resolve, delayMs))
            }
            await updateIntervalsActivityDescription(
              integration,
              workout.externalId,
              mergedDescription
            )
            await prisma.workout.update({
              where: { id: workout.id },
              data: { description: mergedDescription }
            })
            workoutsPublished++
            console.log(chalk.green(`  - Published "${workout.title}"`))
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
      console.log(`Would publish:     ${workoutsWouldPublish}`)
      console.log(`Published:         ${workoutsPublished}`)
      console.log(`Skipped:           ${workoutsSkipped}`)
      console.log(`Errors:            ${workoutsErrored}`)

      if (estimateOnly) {
        console.log(chalk.cyan('\nEstimate complete. Re-run without --estimate-only to apply changes.'))
      } else if (isDryRun) {
        console.log(chalk.cyan('\nRun without --dry-run to apply changes.'))
      }
    } catch (error: any) {
      console.error(chalk.red('Backfill failed:'), error?.message || error)
      process.exitCode = 1
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default backfillWorkoutSummaryNotesCommand
