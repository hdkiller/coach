import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { backfillWorkoutTags } from '../../server/utils/backfill-workout-tags'

const backfillWorkoutTagsCommand = new Command('workout-tags')

backfillWorkoutTagsCommand
  .description('Backfill Workout.tags from Intervals rawJson tags')
  .option('--prod', 'Use production database', false)
  .option('--dry-run', 'Run without saving changes', false)
  .option('--limit <number>', 'Batch size to process per loop', '500')
  .option('--cursor <id>', 'Resume from a workout ID cursor')
  .action(async (options) => {
    const isProd = Boolean(options.prod)
    const dryRun = Boolean(options.dryRun)
    const limit = Number.parseInt(options.limit, 10)
    const cursor = options.cursor || null

    if (!Number.isFinite(limit) || limit <= 0) {
      console.error(chalk.red('The --limit value must be a positive integer.'))
      process.exit(1)
    }

    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (!connectionString) {
      console.error(
        chalk.red(isProd ? 'DATABASE_URL_PROD is not defined.' : 'DATABASE_URL is not defined.')
      )
      process.exit(1)
    }

    console.log(
      isProd
        ? chalk.yellow('Using PRODUCTION database.')
        : chalk.blue('Using DEVELOPMENT database.')
    )

    if (dryRun) {
      console.log(chalk.cyan('DRY RUN mode enabled. No changes will be saved.'))
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      const result = await backfillWorkoutTags(prisma, {
        limit,
        dryRun,
        cursor,
        log: (message) => console.log(chalk.gray(message))
      })

      console.log(chalk.bold('\nSummary:'))
      console.log(JSON.stringify(result, null, 2))

      if (dryRun) {
        console.log(chalk.cyan('\nRun without --dry-run to apply changes.'))
      }
    } catch (error) {
      console.error(chalk.red('Error during workout tag backfill:'), error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default backfillWorkoutTagsCommand
