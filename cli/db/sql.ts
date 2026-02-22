import { Command } from 'commander'
import chalk from 'chalk'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

export const sqlCommand = new Command('sql')
  .description('Execute raw SQL queries')
  .argument('<query>', 'The SQL query to execute')
  .option('--prod', 'Use production database')
  .action(async (query, options) => {
    const isProd = options.prod
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL
    if (!connectionString) {
      console.error(chalk.red('Error: Database connection string is not defined.'))
      process.exit(1)
    }
    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      if (isProd) console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))

      console.log(chalk.cyan(`Executing query: ${query}`))

      const result = await prisma.$queryRawUnsafe(query)

      console.log(chalk.green('\\n--- RESULT ---'))
      console.log(JSON.stringify(result, null, 2))
    } catch (error: any) {
      console.error(chalk.red('\\n--- ERROR ---'))
      console.error(chalk.red(error.message))
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })
