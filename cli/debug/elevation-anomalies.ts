import { Command } from 'commander'
import chalk from 'chalk'
import { Prisma, PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import 'dotenv/config'

type SummaryRow = {
  affectedWorkouts: number
  affectedUsers: number
  bothSentinelCount: number
}

type UserRow = {
  userId: string
  email: string
  affectedCount: number
  latestDate: Date
  maxElevationGain: number
}

type WorkoutRow = {
  id: string
  date: Date
  email: string
  userId: string
  externalId: string
  elevationGain: number
  minAltitude: string | null
  maxAltitude: string | null
  rawSource: string | null
  allAltitudeSentinel: boolean | null
}

const elevationAnomaliesCommand = new Command('elevation-anomalies')

elevationAnomaliesCommand
  .description(
    'Find workouts/users affected by suspicious elevation metadata (e.g. altitude sentinel -500 with non-zero gain).'
  )
  .option('--prod', 'Use production database')
  .option('--days <number>', 'Look back this many days', '30')
  .option('--source <source>', 'Workout source filter', 'intervals')
  .option('--user <email>', 'Filter to a specific user email')
  .option('--limit-users <number>', 'Max users to print', '25')
  .option('--limit-workouts <number>', 'Max workouts to print', '50')
  .action(async (options) => {
    const isProd = Boolean(options.prod)
    const days = Number.parseInt(options.days, 10)
    const limitUsers = Number.parseInt(options.limitUsers, 10)
    const limitWorkouts = Number.parseInt(options.limitWorkouts, 10)
    const source = String(options.source || 'intervals')
    const userEmail = options.user ? String(options.user).trim().toLowerCase() : null

    if (!Number.isFinite(days) || days <= 0) {
      console.error(chalk.red('--days must be a positive integer.'))
      process.exit(1)
    }
    if (!Number.isFinite(limitUsers) || limitUsers <= 0) {
      console.error(chalk.red('--limit-users must be a positive integer.'))
      process.exit(1)
    }
    if (!Number.isFinite(limitWorkouts) || limitWorkouts <= 0) {
      console.error(chalk.red('--limit-workouts must be a positive integer.'))
      process.exit(1)
    }

    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL
    if (!connectionString) {
      console.error(
        chalk.red(isProd ? 'DATABASE_URL_PROD is not defined.' : 'DATABASE_URL is not defined.')
      )
      process.exit(1)
    }

    console.log(chalk.yellow(isProd ? 'Using PRODUCTION database.' : 'Using DEVELOPMENT database.'))

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })
    const userFilterSql = userEmail ? Prisma.sql`AND lower(u.email) = ${userEmail}` : Prisma.empty

    try {
      const summary = await prisma.$queryRaw<SummaryRow[]>`
        WITH suspicious AS (
          SELECT w.id, w."userId", w.date,
                 COALESCE(w."rawJson"->>'min_altitude','') AS min_altitude,
                 COALESCE(w."rawJson"->>'max_altitude','') AS max_altitude
          FROM "Workout" w
          JOIN "User" u ON u.id = w."userId"
          WHERE w.source = ${source}
            AND w.date >= ${since}
            AND w."elevationGain" > 0
            AND (
              COALESCE(w."rawJson"->>'min_altitude','') = '-500'
              OR COALESCE(w."rawJson"->>'max_altitude','') = '-500'
            )
            ${userFilterSql}
        )
        SELECT
          COUNT(*)::int AS "affectedWorkouts",
          COUNT(DISTINCT "userId")::int AS "affectedUsers",
          COUNT(*) FILTER (WHERE min_altitude = '-500' AND max_altitude = '-500')::int AS "bothSentinelCount"
        FROM suspicious;
      `

      const users = await prisma.$queryRaw<UserRow[]>`
        SELECT
          w."userId",
          u.email,
          COUNT(*)::int AS "affectedCount",
          MAX(w.date) AS "latestDate",
          MAX(w."elevationGain")::int AS "maxElevationGain"
        FROM "Workout" w
        JOIN "User" u ON u.id = w."userId"
        WHERE w.source = ${source}
          AND w.date >= ${since}
          AND w."elevationGain" > 0
          AND (
            COALESCE(w."rawJson"->>'min_altitude','') = '-500'
            OR COALESCE(w."rawJson"->>'max_altitude','') = '-500'
          )
          ${userFilterSql}
        GROUP BY w."userId", u.email
        ORDER BY "affectedCount" DESC, "latestDate" DESC
        LIMIT ${limitUsers};
      `

      const workouts = await prisma.$queryRaw<WorkoutRow[]>`
        SELECT
          w.id,
          w.date,
          u.email,
          w."userId",
          w."externalId",
          w."elevationGain",
          w."rawJson"->>'min_altitude' AS "minAltitude",
          w."rawJson"->>'max_altitude' AS "maxAltitude",
          w."rawJson"->>'source' AS "rawSource",
          CASE
            WHEN ws.altitude IS NULL THEN NULL
            ELSE NOT EXISTS (
              SELECT 1
              FROM json_array_elements_text(ws.altitude::json) e(val)
              WHERE (e.val)::numeric <> -500
            )
          END AS "allAltitudeSentinel"
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
        LIMIT ${limitWorkouts};
      `

      const s = summary[0] || { affectedWorkouts: 0, affectedUsers: 0, bothSentinelCount: 0 }
      console.log(chalk.bold('\n--- ELEVATION ANOMALY SUMMARY ---'))
      console.log(`Window: ${since.toISOString()} -> now`)
      console.log(`Source: ${source}`)
      if (userEmail) console.log(`User filter: ${userEmail}`)
      console.log(`Affected workouts: ${s.affectedWorkouts}`)
      console.log(`Affected users: ${s.affectedUsers}`)
      console.log(`Both min/max sentinel (-500): ${s.bothSentinelCount}`)

      if (users.length > 0) {
        console.log(chalk.bold('\nTop affected users:'))
        for (const row of users) {
          console.log(
            `- ${row.email} (${row.userId}) | workouts=${row.affectedCount} | latest=${new Date(row.latestDate).toISOString()} | maxGain=${row.maxElevationGain}m`
          )
        }
      } else {
        console.log(chalk.green('\nNo affected users in selected window.'))
      }

      if (workouts.length > 0) {
        console.log(chalk.bold('\nSample affected workouts:'))
        for (const w of workouts) {
          const sentinelFlag =
            w.allAltitudeSentinel === null
              ? 'no-stream'
              : w.allAltitudeSentinel
                ? 'all--500'
                : 'mixed'
          console.log(
            `- ${w.id} | ${new Date(w.date).toISOString()} | ${w.email} | ext=${w.externalId} | gain=${w.elevationGain}m | min=${w.minAltitude} max=${w.maxAltitude} | rawSource=${w.rawSource || 'n/a'} | stream=${sentinelFlag}`
          )
        }
      }
    } catch (error: any) {
      console.error(chalk.red('Error while scanning elevation anomalies:'), error?.message || error)
      process.exitCode = 1
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default elevationAnomaliesCommand
