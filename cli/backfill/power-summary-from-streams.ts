import { Command } from 'commander'
import chalk from 'chalk'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { summarizePowerFromWatts } from '../../server/utils/power-metrics'

const backfillPowerSummaryFromStreamsCommand = new Command('power-summary-from-streams')

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function parseDateStartUtc(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${value} (expected YYYY-MM-DD)`)
  return date
}

function parseDateEndUtc(value: string): Date {
  const date = new Date(`${value}T23:59:59.999Z`)
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${value} (expected YYYY-MM-DD)`)
  return date
}

backfillPowerSummaryFromStreamsCommand
  .description('Backfill missing power summary fields from WorkoutStream.watts')
  .option('--prod', 'Use production database')
  .option('--dry-run', 'Run without saving changes', false)
  .option('--user <emailOrId>', 'Filter by user email or UUID')
  .option('--type <type>', 'Workout type filter (Run, Ride, all)', 'Run')
  .option('--from <date>', 'Start date (YYYY-MM-DD, inclusive)')
  .option('--to <date>', 'End date (YYYY-MM-DD, inclusive)')
  .option('--last-days <number>', 'Look back this many days (mutually exclusive with --from/--to)')
  .option('--limit <number>', 'Max workouts to process when applying changes', '2000')
  .action(async (options) => {
    const isProd = !!options.prod
    const isDryRun = !!options.dryRun
    const limit = Number.parseInt(options.limit, 10)

    if (!Number.isFinite(limit) || limit <= 0) {
      console.error(chalk.red('Invalid --limit value. Must be a positive integer.'))
      process.exit(1)
    }

    if (options.lastDays && (options.from || options.to)) {
      console.error(chalk.red('Use either --last-days or --from/--to, not both.'))
      process.exit(1)
    }

    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL
    if (isProd) {
      if (!connectionString) {
        console.error(chalk.red('DATABASE_URL_PROD is not defined.'))
        process.exit(1)
      }
      console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))
    } else {
      console.log(chalk.blue('Using DEVELOPMENT database.'))
    }

    if (isDryRun) {
      console.log(chalk.cyan('🔍 DRY RUN mode enabled. No changes will be saved.'))
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      let fromDate: Date | undefined
      let toDate: Date | undefined

      if (options.lastDays) {
        const days = Number.parseInt(options.lastDays, 10)
        if (!Number.isFinite(days) || days <= 0) {
          console.error(chalk.red('Invalid --last-days value. Must be a positive integer.'))
          process.exit(1)
        }
        const now = new Date()
        toDate = now
        fromDate = new Date(now)
        fromDate.setUTCDate(fromDate.getUTCDate() - days)
      } else {
        if (options.from) fromDate = parseDateStartUtc(options.from)
        if (options.to) toDate = parseDateEndUtc(options.to)
      }

      if (fromDate && toDate && fromDate > toDate) {
        console.error(chalk.red('--from cannot be after --to.'))
        process.exit(1)
      }

      let userId: string | undefined
      if (options.user) {
        if (isUuid(options.user)) {
          const user = await prisma.user.findUnique({
            where: { id: options.user },
            select: { id: true, email: true }
          })
          if (!user) {
            console.error(chalk.red(`User not found: ${options.user}`))
            process.exit(1)
          }
          userId = user.id
          console.log(chalk.gray(`User filter: ${user.email} (${user.id})`))
        } else {
          const user = await prisma.user.findUnique({
            where: { email: options.user },
            select: { id: true, email: true }
          })
          if (!user) {
            console.error(chalk.red(`User not found: ${options.user}`))
            process.exit(1)
          }
          userId = user.id
          console.log(chalk.gray(`User filter: ${user.email} (${user.id})`))
        }
      }

      const type = String(options.type || 'Run')
      const typeFilter = type.toLowerCase() === 'all' ? undefined : type

      const params: Array<string | Date | number> = []
      const conditions: string[] = [
        `(w."averageWatts" IS NULL OR w."averageWatts" = 0 OR w."maxWatts" IS NULL OR w."maxWatts" = 0 OR w."normalizedPower" IS NULL OR w."normalizedPower" = 0)`,
        `ws.watts IS NOT NULL`,
        `jsonb_typeof(ws.watts) = 'array'`,
        `(CASE WHEN jsonb_typeof(ws.watts) = 'array' THEN jsonb_array_length(ws.watts) ELSE 0 END) > 0`
      ]

      const addParam = (value: string | Date | number) => {
        params.push(value)
        return `$${params.length}`
      }

      if (typeFilter) {
        conditions.push(`w.type = ${addParam(typeFilter)}`)
      }
      if (userId) {
        conditions.push(`w."userId" = ${addParam(userId)}`)
      }
      if (fromDate) {
        conditions.push(`w.date >= ${addParam(fromDate)}`)
      }
      if (toDate) {
        conditions.push(`w.date <= ${addParam(toDate)}`)
      }

      const whereClause = conditions.join(' AND ')

      const countRows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
        `SELECT COUNT(*)::int AS count
         FROM "Workout" w
         JOIN "WorkoutStream" ws ON ws."workoutId" = w.id
         WHERE ${whereClause}`,
        ...params
      )

      const affectedCount = countRows[0]?.count || 0
      console.log(chalk.bold(`Affected workouts (matching filters): ${affectedCount}`))

      const previewRows = await prisma.$queryRawUnsafe<
        Array<{
          id: string
          date: Date
          title: string
          type: string
          averageWatts: number | null
          maxWatts: number | null
          normalizedPower: number | null
          points: number
        }>
      >(
        `SELECT
            w.id,
            w.date,
            w.title,
            w.type,
            w."averageWatts",
            w."maxWatts",
            w."normalizedPower",
            (CASE WHEN jsonb_typeof(ws.watts) = 'array' THEN jsonb_array_length(ws.watts) ELSE 0 END)::int AS points
         FROM "Workout" w
         JOIN "WorkoutStream" ws ON ws."workoutId" = w.id
         WHERE ${whereClause}
         ORDER BY w.date DESC
         LIMIT 5`,
        ...params
      )

      if (previewRows.length > 0) {
        console.log(chalk.gray('\nPreview (up to 5 workouts):'))
        for (const row of previewRows) {
          console.log(
            `- ${row.id} | ${row.date.toISOString().split('T')[0]} | ${row.type} | ${row.title}`
          )
          console.log(
            chalk.gray(
              `  avg=${row.averageWatts ?? 'NULL'} max=${row.maxWatts ?? 'NULL'} np=${row.normalizedPower ?? 'NULL'} wattsPoints=${row.points}`
            )
          )
        }
      }

      if (isDryRun) {
        console.log(chalk.cyan(`\nDry run complete. Would process up to ${limit} workouts.`))
        return
      }

      if (affectedCount === 0) {
        console.log(chalk.green('No workouts to update.'))
        return
      }

      const idParams: Array<string | Date | number> = [...params]
      const limitPlaceholder = `$${idParams.length + 1}`
      idParams.push(limit)
      const workoutIds = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT w.id
         FROM "Workout" w
         JOIN "WorkoutStream" ws ON ws."workoutId" = w.id
         WHERE ${whereClause}
         ORDER BY w.date DESC
         LIMIT ${limitPlaceholder}`,
        ...idParams
      )

      if (workoutIds.length === 0) {
        console.log(chalk.green('No workouts to update within the selected limit.'))
        return
      }

      const workouts = await prisma.workout.findMany({
        where: { id: { in: workoutIds.map((row) => row.id) } },
        select: {
          id: true,
          title: true,
          date: true,
          averageWatts: true,
          maxWatts: true,
          normalizedPower: true,
          streams: {
            select: {
              watts: true
            }
          }
        }
      })

      let updated = 0
      let skippedNoStreamSummary = 0
      let skippedNoMissingFields = 0

      for (const workout of workouts) {
        const summary = summarizePowerFromWatts(workout.streams?.watts)
        if (!summary) {
          skippedNoStreamSummary++
          continue
        }

        const data: { averageWatts?: number; maxWatts?: number; normalizedPower?: number } = {}
        if (!workout.averageWatts || workout.averageWatts <= 0)
          data.averageWatts = summary.averageWatts
        if (!workout.maxWatts || workout.maxWatts <= 0) data.maxWatts = summary.maxWatts
        if (!workout.normalizedPower || workout.normalizedPower <= 0) {
          data.normalizedPower = summary.normalizedPower
        }

        if (Object.keys(data).length === 0) {
          skippedNoMissingFields++
          continue
        }

        await prisma.workout.update({
          where: { id: workout.id },
          data
        })
        updated++
      }

      console.log(chalk.bold('\nSummary:'))
      console.log(`Selected for processing: ${workoutIds.length}`)
      console.log(`Updated: ${chalk.green(updated)}`)
      console.log(`Skipped (no usable stream summary): ${skippedNoStreamSummary}`)
      console.log(`Skipped (no missing fields): ${skippedNoMissingFields}`)
      if (affectedCount > limit) {
        console.log(
          chalk.yellow(
            `Note: ${affectedCount - limit} additional affected workouts were not processed due to --limit=${limit}.`
          )
        )
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error?.message || error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default backfillPowerSummaryFromStreamsCommand
