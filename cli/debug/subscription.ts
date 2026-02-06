import { Command } from 'commander'
import chalk from 'chalk'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const subscriptionCommand = new Command('subscription').description(
  'Manage and debug user subscriptions'
)

subscriptionCommand
  .command('get')
  .description('Get subscription details for a user')
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
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
          subscriptionTier: true,
          subscriptionStatus: true,
          subscriptionPeriodEnd: true
        }
      })

      if (!user) {
        console.error(chalk.red(`User with email ${email} not found.`))
        return
      }

      console.log(
        chalk.green(`
Subscription details for ${user.email}:`)
      )
      console.table({
        'User ID': user.id,
        'Stripe Customer ID': user.stripeCustomerId || '(none)',
        'Stripe Sub ID': user.stripeSubscriptionId || '(none)',
        Tier: user.subscriptionTier,
        Status: user.subscriptionStatus,
        'Period End': user.subscriptionPeriodEnd
          ? user.subscriptionPeriodEnd.toISOString()
          : '(none)'
      })
    } catch (e) {
      console.error(chalk.red('Error fetching subscription:'), e)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

subscriptionCommand
  .command('clear')
  .description('Clear Stripe ID and subscription data for a user (Reset to FREE)')
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
      console.log(`Clearing Stripe data for ${email}...`)

      const user = await prisma.user.update({
        where: { email },
        data: {
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          subscriptionStatus: 'NONE',
          subscriptionTier: 'FREE',
          subscriptionPeriodEnd: null
        }
      })

      console.log(
        chalk.green(`✅ Stripe data cleared for ${user.email}. User is now on FREE tier.`)
      )
    } catch (e) {
      console.error(chalk.red('Error clearing subscription:'), e)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

subscriptionCommand
  .command('set')
  .description('Manually set subscription tier and status for a user')
  .argument('<email>', 'User email address')
  .argument('<tier>', 'Subscription tier (FREE, SUPPORTER, PRO)')
  .argument(
    '[status]',
    'Subscription status (NONE, TRIALING, ACTIVE, PAST_DUE, CANCELED, UNPAID, DELETED, CONTRIBUTOR)',
    'ACTIVE'
  )
  .option('--prod', 'Use production database')
  .action(async (email, tier, status, options) => {
    const isProd = options.prod
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    const validTiers = ['FREE', 'SUPPORTER', 'PRO']
    const validStatuses = [
      'NONE',
      'TRIALING',
      'ACTIVE',
      'PAST_DUE',
      'CANCELED',
      'UNPAID',
      'DELETED',
      'CONTRIBUTOR'
    ]

    if (!validTiers.includes(tier.toUpperCase())) {
      console.error(chalk.red(`Invalid tier. Must be one of: ${validTiers.join(', ')}`))
      return
    }

    if (!validStatuses.includes(status.toUpperCase())) {
      console.error(chalk.red(`Invalid status. Must be one of: ${validStatuses.join(', ')}`))
      return
    }

    if (isProd) {
      console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      const user = await prisma.user.update({
        where: { email },
        data: {
          subscriptionTier: tier.toUpperCase() as any,
          subscriptionStatus: status.toUpperCase() as any,
          subscriptionPeriodEnd:
            tier.toUpperCase() === 'FREE' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default to 30 days if not FREE
        }
      })

      console.log(
        chalk.green(
          `✅ User ${user.email} updated to ${user.subscriptionTier} tier with ${user.subscriptionStatus} status.`
        )
      )
    } catch (e) {
      console.error(chalk.red('Error updating user subscription:'), e)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default subscriptionCommand
