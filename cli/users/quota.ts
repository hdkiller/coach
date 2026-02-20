import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { getQuotaSummary } from '../../server/utils/quotas/engine'

const quotaCommand = new Command('quota')
  .description("Check a user's LLM usage and quotas")
  .argument('<email>', 'User email')
  .option('--prod', 'Use production database')
  .action(async (email, options) => {
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

    // Set DATABASE_URL for the engine to use
    process.env.DATABASE_URL = connectionString

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, subscriptionTier: true, trialEndsAt: true }
      })

      if (!user) {
        console.log(chalk.red(`User with email "${email}" not found.`))
        return
      }

      console.log(chalk.bold(`\nUser: ${chalk.cyan(user.email)} (ID: ${user.id})`))
      console.log(`Tier: ${chalk.green(user.subscriptionTier)}`)
      if (user.trialEndsAt) {
        const isTrialActive = new Date(user.trialEndsAt) > new Date()
        console.log(
          `Trial Ends: ${user.trialEndsAt.toISOString()} (${isTrialActive ? chalk.green('ACTIVE') : chalk.red('EXPIRED')})`
        )
      }

      console.log(chalk.bold('\nQuota Status:'))
      const quotas = await getQuotaSummary(user.id)

      if (quotas.length === 0) {
        console.log(chalk.yellow('No active quotas found for this user.'))
      } else {
        const quotaTable = quotas.map((q) => ({
          Operation: q.operation.replace(/_/g, ' '),
          Used: q.used,
          Limit: q.limit,
          Remaining: q.remaining,
          Window: q.window,
          Allowed: q.allowed ? 'YES' : 'NO',
          Resets: q.resetsAt ? q.resetsAt.toISOString() : 'N/A'
        }))
        console.table(quotaTable)
      }

      console.log(chalk.bold('\nRecent LLM Usage (Last 7 Days):'))

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const usage = await prisma.llmUsage.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: sevenDaysAgo }
        },
        orderBy: { createdAt: 'desc' },
        select: {
          operation: true,
          success: true,
          createdAt: true,
          model: true
        }
      })

      if (usage.length === 0) {
        console.log(chalk.yellow('No LLM usage recorded in the last 7 days.'))
      } else {
        // Group by operation
        const stats: Record<string, any> = {}
        usage.forEach((u) => {
          if (!stats[u.operation]) {
            stats[u.operation] = { count: 0, successful: 0, failed: 0, lastUsed: u.createdAt }
          }
          stats[u.operation].count++
          if (u.success) stats[u.operation].successful++
          else stats[u.operation].failed++
          if (u.createdAt > stats[u.operation].lastUsed) {
            stats[u.operation].lastUsed = u.createdAt
          }
        })

        const summaryTable = Object.entries(stats).map(([op, s]) => ({
          Operation: op,
          Total: s.count,
          Success: s.successful,
          Failed: s.failed,
          LastUsed: s.lastUsed.toISOString()
        }))

        console.table(summaryTable)

        console.log(chalk.bold('\nDetailed Activity (Last 5 records):'))
        console.table(
          usage.slice(0, 5).map((u) => ({
            Operation: u.operation,
            Status: u.success ? 'SUCCESS' : 'FAILED',
            Time: u.createdAt.toISOString(),
            Model: u.model
          }))
        )
      }
    } catch (e: any) {
      console.error(chalk.red('Error fetching data:'), e.message)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default quotaCommand
