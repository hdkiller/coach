import { Command } from 'commander'
import chalk from 'chalk'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const contributorCommand = new Command('contributor').description('Manage contributor access')

contributorCommand
  .command('add')
  .description('Grant CONTRIBUTOR status (Lifetime Pro) to a user')
  .argument('<email>', 'User email address')
  .option('--prod', 'Use production database')
  .action(async (email, options) => {
    const isProd = options.prod
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (isProd) {
      console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))
    } else {
      console.log(chalk.blue('Using DEVELOPMENT database.'))
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      console.log(`Granting CONTRIBUTOR status to ${email}...`)

      const user = await prisma.user.update({
        where: { email },
        data: {
          subscriptionTier: 'PRO',
          subscriptionStatus: 'CONTRIBUTOR',
          subscriptionPeriodEnd: null // Lifetime access
        }
      })

      console.log(chalk.green(`✅ User ${user.email} is now a CONTRIBUTOR with PRO access.`))
    } catch (e) {
      console.error(chalk.red('Error updating user:'), e)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

contributorCommand
  .command('remove')
  .description('Revoke CONTRIBUTOR status (Downgrade to FREE)')
  .argument('<email>', 'User email address')
  .option('--prod', 'Use production database')
  .action(async (email, options) => {
    const isProd = options.prod
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      console.log(`Revoking CONTRIBUTOR status from ${email}...`)

      const user = await prisma.user.update({
        where: { email },
        data: {
          subscriptionTier: 'FREE',
          subscriptionStatus: 'NONE',
          subscriptionPeriodEnd: null
        }
      })

      console.log(chalk.green(`✅ User ${user.email} is now on FREE tier.`))
    } catch (e) {
      console.error(chalk.red('Error updating user:'), e)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default contributorCommand
