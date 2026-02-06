import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import Stripe from 'stripe'

const listCommand = new Command('list')
  .description('List users with active or past Stripe subscriptions')
  .option('--prod', 'Use production database')
  .option('--all', 'Show all users with a Stripe Customer ID (including FREE tier)')
  .action(async (options) => {
    const isProd = options.prod
    const showAll = options.all
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL
    const stripeSecretKey = isProd
      ? process.env.STRIPE_PROD_SECRET_KEY
      : process.env.STRIPE_SECRET_KEY

    if (isProd) {
      console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))
    } else {
      console.log(chalk.blue('Using DEVELOPMENT database.'))
    }

    if (!connectionString) {
      console.error(chalk.red('Error: Database connection string is not defined.'))
      process.exit(1)
    }

    const stripe = stripeSecretKey
      ? new Stripe(stripeSecretKey, {
          apiVersion: '2025-01-27.acacia' as any
        })
      : null

    if (!stripe) {
      console.warn(
        chalk.yellow(
          `⚠️  ${isProd ? 'STRIPE_PROD_SECRET_KEY' : 'STRIPE_SECRET_KEY'} not found. Subscription start dates will be unavailable.`
        )
      )
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      console.log(chalk.blue('Fetching subscription data...'))

      const users = await prisma.user.findMany({
        where: showAll
          ? { stripeCustomerId: { not: null } }
          : { subscriptionTier: { not: 'FREE' } },
        select: {
          id: true,
          email: true,
          name: true,
          subscriptionTier: true,
          subscriptionStatus: true,
          subscriptionPeriodEnd: true,
          stripeSubscriptionId: true,
          stripeCustomerId: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: {
          updatedAt: 'desc'
        }
      })

      if (users.length === 0) {
        console.log(chalk.yellow('No users with subscriptions found.'))
      } else {
        console.log(chalk.green(`Found ${users.length} user(s) with subscription data:`))

        const formattedUsers = await Promise.all(
          users.map(async (u) => {
            let startedAt = 'N/A'
            let periodEnd = u.subscriptionPeriodEnd
              ? u.subscriptionPeriodEnd.toISOString().split('T')[0]
              : 'N/A'

            if (stripe && u.stripeSubscriptionId) {
              try {
                const sub = await stripe.subscriptions.retrieve(u.stripeSubscriptionId)
                startedAt = new Date(sub.created * 1000).toISOString().split('T')[0]
                periodEnd = new Date(sub.current_period_end * 1000).toISOString().split('T')[0]
              } catch (e: any) {
                // Silently skip if sub not found or other Stripe error
              }
            }

            return {
              Email: u.email,
              Name: u.name || 'N/A',
              Tier: u.subscriptionTier,
              Status: u.subscriptionStatus,
              Started: startedAt,
              'Period End': periodEnd,
              Updated: u.updatedAt ? u.updatedAt.toISOString().split('T')[0] : 'N/A',
              'Sub ID': u.stripeSubscriptionId
                ? `${u.stripeSubscriptionId.substring(0, 12)}...`
                : 'N/A',
              'Cust ID': u.stripeCustomerId || 'N/A'
            }
          })
        )

        formattedUsers.sort((a, b) => {
          if (a.Started === 'N/A') return 1
          if (b.Started === 'N/A') return -1
          return b.Started.localeCompare(a.Started)
        })

        console.table(formattedUsers)
      }
    } catch (e: any) {
      console.error(chalk.red('Error fetching subscriptions:'), e.message)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default listCommand
