import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { generateDailyCheckinTask } from '../../trigger/daily-checkin'

export const triggerCheckinCommand = new Command('checkin')
  .description('Trigger daily check-in generation for a user')
  .argument('<email>', 'User email')
  .option('--date <yyyy-mm-dd>', 'Target date (defaults to today)')
  .option('--prod', 'Use production Trigger.dev')
  .action(async (email, options) => {
    const isProd = options.prod
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (isProd) {
      process.env.TRIGGER_SECRET_KEY = process.env.TRIGGER_SECRET_KEY_PROD
      console.log(chalk.yellow('⚠️  Using PRODUCTION environment.'))
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
        where: { email }
      })

      if (!user) {
        console.error(chalk.red(`User ${email} not found`))
        return
      }

      const dateStr = options.date || new Date().toISOString().split('T')[0]
      const date = new Date(`${dateStr}T00:00:00Z`)

      console.log(chalk.blue(`Triggering check-in for ${email} on ${dateStr}...`))

      const run = await generateDailyCheckinTask.trigger({
        userId: user.id,
        date
      })

      console.log(chalk.green(`Successfully triggered run: ${run.id}`))
      console.log(
        `View progress: https://cloud.trigger.dev/projects/${process.env.TRIGGER_PROJECT_REF}/runs/${run.id}`
      )
    } catch (e: any) {
      console.error(chalk.red('Error triggering check-in:'), e)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })
