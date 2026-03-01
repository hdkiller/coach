import { Command } from 'commander'
import chalk from 'chalk'
import { Prisma, PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { pbDetectionService } from '../../server/utils/services/pbDetectionService'

const backfillPBCommand = new Command('personal-bests')

backfillPBCommand
  .description('Backfill Personal Bests for workouts with available streams.')
  .option('--prod', 'Use production database')
  .option('--user <email>', 'Filter to a specific user email')
  .option('--limit <number>', 'Max workouts to process', '1000')
  .option('--days <number>', 'Look back this many days', '365')
  .action(async (options) => {
    const isProd = Boolean(options.prod)
    const limit = Number.parseInt(options.limit, 10)
    const days = Number.parseInt(options.days, 10)
    const userEmail = options.user ? String(options.user).trim().toLowerCase() : null

    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL
    if (!connectionString) {
      console.error(chalk.red('Database connection string not found.'))
      process.exit(1)
    }

    console.log(
      chalk.yellow(isProd ? '⚠️  Using PRODUCTION database.' : 'Using DEVELOPMENT database.')
    )

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

      const userFilter = userEmail ? { user: { email: userEmail } } : {}

      const workouts = await prisma.workout.findMany({
        where: {
          date: { gte: since },
          isDuplicate: false,
          streams: { isNot: null },
          ...userFilter
        },
        orderBy: { date: 'asc' }, // Process in chronological order to build history correctly
        take: limit,
        select: { id: true, title: true, date: true }
      })

      console.log(chalk.cyan(`Found ${workouts.length} workouts to analyze.`))

      let processed = 0
      let totalPBs = 0

      for (const workout of workouts) {
        process.stdout.write(
          chalk.gray(
            `\rProcessing [${processed + 1}/${workouts.length}]: ${workout.title || 'Untitled'}...`
          )
        )

        try {
          const results = await pbDetectionService.detectPBs(workout.id)
          if (results && results.length > 0) {
            totalPBs += results.length
          }
        } catch (err) {
          console.error(chalk.red(`\nError processing workout ${workout.id}:`), err)
        }

        processed++
      }

      console.log('\n\n' + chalk.bold.green('Backfill Complete!'))
      console.log(`Workouts Processed: ${processed}`)
      console.log(`New PBs Detected:   ${totalPBs}`)
    } catch (error: any) {
      console.error(chalk.red('\nFatal Error:'), error)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default backfillPBCommand
