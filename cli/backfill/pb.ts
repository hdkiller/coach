import { Command } from 'commander'
import chalk from 'chalk'
import { Prisma, PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { pbDetectionService } from '../../server/utils/services/pbDetectionService'

const backfillPBCommand = new Command('personal-bests')

backfillPBCommand
  .description('High-performance backfill for Personal Bests (supports 100k+ records).')
  .option('--prod', 'Use production database')
  .option('--user <email>', 'Filter to a specific user email')
  .option('--user-id <uuid>', 'Filter to a specific user ID')
  .option('--limit <number>', 'Max workouts to process', '1000')
  .option('--days <number>', 'Look back this many days (omit for all-time)')
  .option('--batch-size <number>', 'Database fetch batch size', '500')
  .option('--concurrency <number>', 'Parallel processing limit', '5')
  .action(async (options) => {
    const isProd = Boolean(options.prod)
    const limit = Number.parseInt(options.limit, 10)
    const days = options.days ? Number.parseInt(options.days, 10) : null
    const batchSize = Number.parseInt(options.batchSize, 10)
    const concurrency = Number.parseInt(options.concurrency, 10)
    const userEmail = options.user ? String(options.user).trim().toLowerCase() : null
    const userId = options.userId ? String(options.userId).trim() : null

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
      const filters: any = {
        isDuplicate: false,
        streams: { isNot: null }
      }

      if (days != null) {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        filters.date = { gte: since }
      }

      if (userEmail) filters.user = { email: userEmail }
      if (userId) filters.userId = userId

      // Count total matching workouts
      const totalMatching = await prisma.workout.count({ where: filters })
      const toProcess = Math.min(totalMatching, limit)

      console.log(
        chalk.cyan(`Target: Processing ${toProcess} of ${totalMatching} matching workouts.`)
      )
      console.log(
        chalk.gray(
          `Batch Size: ${batchSize} | Concurrency: ${concurrency} | Range: ${days != null ? `${days} days` : 'all-time'}\n`
        )
      )

      let processedCount = 0
      let pbDetectedCount = 0
      let skip = 0

      const startTime = Date.now()

      while (processedCount < toProcess) {
        const take = Math.min(batchSize, toProcess - processedCount)

        // Fetch batch of IDs and basic info
        const workouts = await prisma.workout.findMany({
          where: filters,
          orderBy: { date: 'asc' },
          skip: skip,
          take: take,
          include: {
            streams: true // Pre-fetch streams for speed
          }
        })

        if (workouts.length === 0) break

        // Process batch with simple concurrency pool
        const batchResults = await processPool(
          workouts,
          async (workout) => {
            try {
              const results = await pbDetectionService.detectPBs(workout, prisma)
              return results?.length || 0
            } catch (err) {
              console.error(chalk.red(`\n[Error] Workout ${workout.id}:`), err)
              return 0
            }
          },
          concurrency,
          (count) => {
            processedCount++
            const pct = ((processedCount / toProcess) * 100).toFixed(1)
            const elapsed = (Date.now() - startTime) / 1000
            const rate = (processedCount / elapsed).toFixed(1)
            process.stdout.write(
              chalk.gray(
                `\rProgress: ${processedCount}/${toProcess} (${pct}%) | ${rate} w/s | PBs: ${pbDetectedCount}`
              )
            )
          }
        )

        pbDetectedCount += batchResults.reduce((a, b) => a + b, 0)
        skip += workouts.length
      }

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
      console.log('\n\n' + chalk.bold.green('Backfill Complete!'))
      console.log(`Total Time:         ${totalTime}s`)
      console.log(`Workouts Processed: ${processedCount}`)
      console.log(`New PBs Detected:   ${pbDetectedCount}`)
    } catch (error: any) {
      console.error(chalk.red('\nFatal Error:'), error)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

/**
 * Simple concurrency pool
 */
async function processPool<T, R>(
  items: T[],
  task: (item: T) => Promise<R>,
  concurrency: number,
  onItemDone: (result: R) => void
): Promise<R[]> {
  const results: R[] = []
  const queue = [...items]
  let active = 0

  return new Promise((resolve) => {
    async function next() {
      if (queue.length === 0 && active === 0) {
        return resolve(results)
      }

      while (active < concurrency && queue.length > 0) {
        active++
        const item = queue.shift()!

        task(item).then((res) => {
          results.push(res)
          active--
          onItemDone(res)
          next()
        })
      }
    }
    next()
  })
}

export default backfillPBCommand
