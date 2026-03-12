import { Command } from 'commander'
import chalk from 'chalk'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { backfillWellnessSpO2 } from '../../server/utils/backfill-wellness-spo2'

const backfillWellnessSpO2Command = new Command('wellness-spo2')

backfillWellnessSpO2Command
  .description('Backfill incorrectly scaled wellness SpO2 values (e.g. 1 -> 100)')
  .option('--prod', 'Use production database', false)
  .option('--dry-run', 'Run without saving changes', false)
  .option('--limit <number>', 'Batch size to process per loop', '500')
  .option('--user <emailOrId>', 'Filter by a specific user email or user ID')
  .action(async (options) => {
    const isProd = Boolean(options.prod)
    const dryRun = Boolean(options.dryRun)
    const limit = Number.parseInt(String(options.limit || '500'), 10)

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
      let userId: string | null = null

      if (options.user) {
        const user = await prisma.user.findFirst({
          where: {
            OR: [{ id: String(options.user) }, { email: String(options.user) }]
          },
          select: { id: true, email: true }
        })

        if (!user) {
          console.error(chalk.red(`User not found: ${options.user}`))
          process.exit(1)
        }

        userId = user.id
        console.log(chalk.gray(`Filtering by user: ${user.email} (${user.id})`))
      }

      const result = await backfillWellnessSpO2(prisma, {
        dryRun,
        limit,
        userId,
        log: (message) => console.log(chalk.gray(message))
      })

      console.log(chalk.bold('\nSummary:'))
      console.log(`Scanned: ${result.scanned}`)
      console.log(`Matched: ${result.matched}`)
      console.log(`${dryRun ? 'Would update' : 'Updated'}: ${result.updated}`)
      console.log(`Skipped: ${result.skipped}`)
      console.log(`Batches: ${result.batches}`)

      if (result.samples.length > 0) {
        console.log(chalk.bold('\nSamples:'))
        for (const sample of result.samples) {
          console.log(
            `${sample.date} ${sample.userId} ${sample.oldSpO2} -> ${sample.newSpO2} (${sample.lastSource || 'unknown'})`
          )
        }
      } else {
        console.log(chalk.green('\nNo incorrectly scaled SpO2 records found.'))
      }

      if (dryRun && result.updated > 0) {
        console.log(chalk.cyan('\nRun without --dry-run to apply changes.'))
      }
    } catch (error) {
      console.error(chalk.red('Error during wellness SpO2 backfill:'), error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default backfillWellnessSpO2Command
