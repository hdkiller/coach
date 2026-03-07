import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { subDays, format } from 'date-fns'
import { fetchUltrahumanDaily, normalizeUltrahumanWellness } from '../../server/utils/ultrahuman'

const ultrahumanIngestCommand = new Command('ultrahuman-ingest')
  .description('Debug Ultrahuman ingestion for a user')
  .argument('<email>', 'User email')
  .option('--prod', 'Use production database')
  .option('--days <number>', 'Number of days to sync', '7')
  .option('--dry-run', "Don't save to database")
  .action(async (email, options) => {
    const isProd = options.prod
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (!connectionString) {
      console.error(chalk.red('Database connection string not found.'))
      process.exit(1)
    }

    if (isProd) {
      console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))
    } else {
      console.log(chalk.blue('Using DEVELOPMENT database.'))
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    // Set global prisma for utils that might use it
    globalThis.prismaGlobalV2 = prisma as any

    try {
      const user = await prisma.user.findUnique({
        where: { email }
      })

      if (!user) {
        console.error(chalk.red(`User not found: ${email}`))
        process.exit(1)
      }

      const integration = await prisma.integration.findUnique({
        where: {
          userId_provider: {
            userId: user.id,
            provider: 'ultrahuman'
          }
        }
      })

      if (!integration) {
        console.error(chalk.red(`Ultrahuman integration not found for user ${user.id}`))
        process.exit(1)
      }

      const days = parseInt(options.days)
      const endDate = new Date()
      const startDate = subDays(endDate, days)

      console.log(chalk.cyan(`\n=== Debugging Ultrahuman Ingestion for ${user.email} ===`))
      console.log(
        chalk.gray(`Range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`)
      )

      let savedCount = 0
      let skippedCount = 0

      for (let i = 0; i <= days; i++) {
        const date = subDays(endDate, i)
        const dateStr = format(date, 'yyyy-MM-dd')
        process.stdout.write(`Processing ${dateStr}... `)

        try {
          // fetchUltrahumanDaily uses ensureValidToken which uses global prisma
          const dailyData = await fetchUltrahumanDaily(integration as any, date)

          if (!dailyData) {
            process.stdout.write(chalk.yellow('No data from API\n'))
            skippedCount++
            continue
          }

          const wellness = normalizeUltrahumanWellness(dailyData, user.id, date)

          if (!wellness) {
            process.stdout.write(chalk.yellow('Normalization returned null\n'))
            skippedCount++
            continue
          }

          process.stdout.write(
            chalk.green(`OK (HRV: ${wellness.hrv}, Sleep: ${wellness.sleepScore}) `)
          )

          if (options.dryRun) {
            process.stdout.write(chalk.blue('[DRY RUN - NOT SAVING]\n'))
          } else {
            // Manual upsert to avoid repository dependencies if possible,
            // but let's try to use the repository if we can.
            // wellnessRepository uses global prisma.
            const { wellnessRepository } =
              await import('../../server/utils/repositories/wellnessRepository')

            await wellnessRepository.upsert(
              user.id,
              wellness.date,
              wellness as any,
              wellness as any,
              'ultrahuman'
            )
            process.stdout.write(chalk.green('[SAVED]\n'))
            savedCount++
          }
        } catch (err: any) {
          process.stdout.write(chalk.red(`FAILED: ${err.message}\n`))
        }
      }

      console.log(chalk.cyan(`\nSummary: Saved: ${savedCount}, Skipped: ${skippedCount}`))
    } catch (e: any) {
      console.error(chalk.red('Error:'), e.message)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default ultrahumanIngestCommand
