import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const trialsCommand = new Command('trials').description('User trial period management')

trialsCommand
  .command('backfill')
  .description('Initialize trial periods for existing users')
  .option('--prod', 'Use production database')
  .option('--days <number>', 'Number of trial days to grant from creation date', '7')
  .action(async (options) => {
    const isProd = options.prod
    const trialDays = parseInt(options.days)
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
      console.log(chalk.cyan(`Starting trial period backfill (${trialDays} days from signup)...`))

      const users = await prisma.user.findMany({
        where: {
          trialEndsAt: null
        },
        select: {
          id: true,
          email: true,
          createdAt: true
        }
      })

      if (users.length === 0) {
        console.log(chalk.green('All users already have a trial period defined. Nothing to do.'))
        return
      }

      console.log(chalk.yellow(`Found ${users.length} users to update.`))

      let updatedCount = 0
      for (const user of users) {
        const trialEndsAt = new Date(user.createdAt)
        trialEndsAt.setDate(trialEndsAt.getDate() + trialDays)

        await prisma.user.update({
          where: { id: user.id },
          data: { trialEndsAt }
        })

        updatedCount++
        if (updatedCount % 10 === 0) {
          console.log(chalk.gray(`Progress: ${updatedCount}/${users.length}...`))
        }
      }

      console.log(chalk.green(`✅ Success! Updated ${updatedCount} users.`))
    } catch (e) {
      console.error(chalk.red('Error during backfill:'), e)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default trialsCommand
