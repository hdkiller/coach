import { Command } from 'commander'
import chalk from 'chalk'
import { Prisma, PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { computeElevationGainFromAltitudeStream } from '../../server/utils/intervals'

type CandidateRow = {
  id: string
  userId: string
  email: string
  date: Date
  externalId: string
  elevationGain: number | null
  minAltitude: string | null
  maxAltitude: string | null
  altitude: unknown
}

const backfillElevationGainCommand = new Command('elevation-gain')

backfillElevationGainCommand
  .description(
    'Backfill invalid Intervals elevation gain values caused by sentinel altitude metadata.'
  )
  .option('--prod', 'Use production database')
  .option('--dry-run', 'Run without saving changes', false)
  .option('--days <number>', 'Look back this many days', '90')
  .option('--source <source>', 'Workout source filter', 'intervals')
  .option('--user <email>', 'Filter to a specific user email')
  .option('--limit <number>', 'Max workouts to process', '500')
  .action(async (options) => {
    const isProd = Boolean(options.prod)
    const isDryRun = Boolean(options.dryRun)
    const days = Number.parseInt(options.days, 10)
    const limit = Number.parseInt(options.limit, 10)
    const source = String(options.source || 'intervals')
    const userEmail = options.user ? String(options.user).trim().toLowerCase() : null

    if (!Number.isFinite(days) || days <= 0) {
      console.error(chalk.red('--days must be a positive integer.'))
      process.exit(1)
    }
    if (!Number.isFinite(limit) || limit <= 0) {
      console.error(chalk.red('--limit must be a positive integer.'))
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
      chalk.yellow(isProd ? '⚠️  Using PRODUCTION database.' : 'Using DEVELOPMENT database.')
    )
    if (isDryRun) {
      console.log(chalk.cyan('🔍 DRY RUN mode enabled. No changes will be saved.'))
    }

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      const userFilterSql = userEmail ? Prisma.sql`AND lower(u.email) = ${userEmail}` : Prisma.empty

      const candidates = await prisma.$queryRaw<CandidateRow[]>`
        SELECT
          w.id,
          w."userId",
          u.email,
          w.date,
          w."externalId",
          w."elevationGain",
          w."rawJson"->>'min_altitude' AS "minAltitude",
          w."rawJson"->>'max_altitude' AS "maxAltitude",
          ws.altitude
        FROM "Workout" w
        JOIN "User" u ON u.id = w."userId"
        LEFT JOIN "WorkoutStream" ws ON ws."workoutId" = w.id
        WHERE w.source = ${source}
          AND w.date >= ${since}
          AND w."elevationGain" > 0
          AND (
            COALESCE(w."rawJson"->>'min_altitude','') = '-500'
            OR COALESCE(w."rawJson"->>'max_altitude','') = '-500'
          )
          ${userFilterSql}
        ORDER BY w.date DESC
        LIMIT ${limit};
      `

      console.log(chalk.gray(`Found ${candidates.length} candidate workouts.`))

      let processed = 0
      let changed = 0
      let setFromStream = 0
      let nulled = 0
      let unchanged = 0

      for (const row of candidates) {
        processed++
        const altitudeArray = Array.isArray(row.altitude)
          ? (row.altitude as Array<number | null>)
          : null
        const streamGain = computeElevationGainFromAltitudeStream(altitudeArray)
        const targetElevation = streamGain !== null ? streamGain : null

        const isDifferent = row.elevationGain !== targetElevation
        if (!isDifferent) {
          unchanged++
          continue
        }

        if (isDryRun) {
          console.log(
            `[DRY RUN] ${row.id} | ${row.email} | ext=${row.externalId} | gain ${row.elevationGain} -> ${targetElevation}`
          )
        } else {
          await prisma.workout.update({
            where: { id: row.id },
            data: { elevationGain: targetElevation }
          })
        }

        changed++
        if (targetElevation === null) nulled++
        else setFromStream++

        if (!isDryRun && changed % 50 === 0) process.stdout.write('.')
      }

      console.log('\n')
      console.log(chalk.bold('Summary:'))
      console.log(`Window start:           ${since.toISOString()}`)
      console.log(`Source:                 ${source}`)
      if (userEmail) console.log(`User filter:            ${userEmail}`)
      console.log(`Candidates processed:   ${processed}`)
      console.log(`Changed:                ${changed}`)
      console.log(`Set from stream gain:   ${setFromStream}`)
      console.log(`Set to null:            ${nulled}`)
      console.log(`Unchanged:              ${unchanged}`)
    } catch (error: any) {
      console.error(chalk.red('Error:'), error?.message || error)
      process.exitCode = 1
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default backfillElevationGainCommand
