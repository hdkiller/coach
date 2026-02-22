import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { mapOperationToQuota } from '../../server/utils/quotas/registry'

const resetQuotaCommand = new Command('reset-quota')
  .description("Reset a user's LLM usage quota for a specific operation")
  .argument('<email>', 'User email')
  .argument('<operation>', 'Operation to reset (e.g. generate_structured_workout)')
  .option('--prod', 'Use production database')
  .action(async (email, operation, options) => {
    const isProd = options.prod
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (isProd) {
      console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))
    } else {
      console.log(chalk.blue('Using DEVELOPMENT database.'))
    }

    if (!connectionString) {
      console.error(chalk.red('Error: Database connection string is not defined.'))
      process.exit(1)
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true }
      })

      if (!user) {
        console.log(chalk.red(`User with email "${email}" not found.`))
        return
      }

      const mappedOperation = mapOperationToQuota(operation)
      if (!mappedOperation) {
        console.log(chalk.red(`Invalid operation "${operation}".`))
        return
      }

      console.log(
        chalk.bold(`Resetting quota for user: ${chalk.cyan(user.email)} (ID: ${user.id})`)
      )
      console.log(`Operation: ${chalk.green(mappedOperation)}`)

      // Delete the usage records for this user and operation
      const result = await prisma.llmUsage.deleteMany({
        where: {
          userId: user.id,
          operation: mappedOperation
        }
      })

      console.log(chalk.green(`Successfully deleted ${result.count} usage records.`))
    } catch (e: any) {
      console.error(chalk.red('Error resetting quota:'), e.message)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default resetQuotaCommand
