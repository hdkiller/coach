import { Command } from 'commander'
import chalk from 'chalk'
import { PrismaClient, Prisma } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const backfillMaxWattsCommand = new Command('max-watts')

backfillMaxWattsCommand
  .description('Backfill maxWatts field from rawJson and averageWatts')
  .option('--prod', 'Use production database')
  .option('--dry-run', 'Run without saving changes', false)
  .option('--user <email>', 'Filter by user email')
  .option('--limit <number>', 'Limit the number of records to process', '2000')
  .action(async (options) => {
    const isProd = options.prod
    const isDryRun = options.dryRun
    const limit = parseInt(options.limit)

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
      let userIdFilter = ''
      const queryParams: any[] = []

      if (options.user) {
        const user = await prisma.user.findUnique({ where: { email: options.user } })
        if (!user) {
          console.error(chalk.red(`User not found: ${options.user}`))
          process.exit(1)
        }
        userIdFilter = 'AND "userId" = $1'
        queryParams.push(user.id)
      }

      console.log(chalk.gray(`Starting optimized bulk update (Limit: ${limit})...`))

      if (isDryRun) {
        const count = await prisma.$queryRawUnsafe<any[]>(
          `SELECT COUNT(*) FROM "Workout" 
           WHERE ("maxWatts" IS NULL OR "maxWatts" = 0)
           AND "rawJson" IS NOT NULL
           ${userIdFilter}`,
          ...queryParams
        )
        console.log(
          chalk.green(`[DRY RUN] Would attempt to update approximately ${count[0].count} records.`)
        )
        console.log(chalk.cyan('Run without --dry-run to apply changes.'))
        return
      }

      // Optimized SQL query:
      // 1. Coalesce various peak power fields from JSON
      // 2. If all JSON fields are missing, fallback to averageWatts
      // 3. Ensure we only update records where we actually find a non-zero value
      const result = await prisma.$executeRawUnsafe(
        `WITH updated_values AS (
          SELECT 
            id,
            COALESCE(
              NULLIF(( "rawJson"->>'max_watts' )::float, 0),
              NULLIF(( "rawJson"->>'icu_pm_p_max' )::float, 0),
              NULLIF(( "rawJson"->>'icu_rolling_p_max' )::float, 0),
              NULLIF(( "rawJson"->>'p_max' )::float, 0),
              NULLIF("averageWatts", 0)
            ) as new_max_watts
          FROM "Workout"
          WHERE ("maxWatts" IS NULL OR "maxWatts" = 0)
          AND "rawJson" IS NOT NULL
          ${userIdFilter}
          LIMIT ${limit}
        )
        UPDATE "Workout" w
        SET "maxWatts" = uv.new_max_watts
        FROM updated_values uv
        WHERE w.id = uv.id
        AND uv.new_max_watts IS NOT NULL AND uv.new_max_watts > 0`,
        ...queryParams
      )

      console.log('\n' + chalk.bold('Summary:'))
      console.log(`Updated: ${chalk.green(result)} records.`)
    } catch (e: any) {
      console.error(chalk.red('Error:'), e)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default backfillMaxWattsCommand
