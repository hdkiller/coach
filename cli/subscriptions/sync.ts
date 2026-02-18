import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import Stripe from 'stripe'

const syncCommand = new Command('sync')
  .description('Audit and sync user subscription statuses with Stripe')
  .option('--prod', 'Use production database and Stripe keys')
  .option('--fix', 'Automatically update database to match Stripe status')
  .option('--email <email>', 'Sync a specific user by email')
  .action(async (options) => {
    const isProd = options.prod
    const fix = options.fix
    const specificEmail = options.email

    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL
    const stripeSecretKey = isProd
      ? process.env.STRIPE_PROD_SECRET_KEY
      : process.env.STRIPE_SECRET_KEY

    if (isProd) {
      console.log(chalk.yellow('⚠️  Using PRODUCTION environment.'))
    } else {
      console.log(chalk.blue('Using DEVELOPMENT environment.'))
    }

    if (!connectionString) {
      console.error(chalk.red('Error: Database connection string is not defined.'))
      process.exit(1)
    }

    if (!stripeSecretKey) {
      console.error(chalk.red('Error: Stripe secret key is not defined.'))
      process.exit(1)
    }

    const envPrice = (key: string) =>
      isProd
        ? process.env[`STRIPE_PROD_${key}`] || process.env[`STRIPE_${key}`]
        : process.env[`STRIPE_${key}`]

    // Load price IDs from env
    const priceIds = {
      supporter: [
        envPrice('SUPPORTER_MONTHLY_PRICE_ID'),
        envPrice('SUPPORTER_ANNUAL_PRICE_ID'),
        envPrice('SUPPORTER_MONTHLY_EUR_PRICE_ID'),
        envPrice('SUPPORTER_ANNUAL_EUR_PRICE_ID')
      ].filter(Boolean) as string[],
      pro: [
        envPrice('PRO_MONTHLY_PRICE_ID'),
        envPrice('PRO_ANNUAL_PRICE_ID'),
        envPrice('PRO_MONTHLY_EUR_PRICE_ID'),
        envPrice('PRO_ANNUAL_EUR_PRICE_ID')
      ].filter(Boolean) as string[]
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-01-27.acacia' as any
    })

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      console.log(chalk.blue('Fetching users with Stripe data...'))

      const users = await prisma.user.findMany({
        where: {
          AND: [specificEmail ? { email: specificEmail } : {}, { stripeCustomerId: { not: null } }]
        },
        select: {
          id: true,
          email: true,
          name: true,
          subscriptionTier: true,
          subscriptionStatus: true,
          subscriptionPeriodEnd: true,
          stripeSubscriptionId: true,
          stripeCustomerId: true
        }
      })

      if (users.length === 0) {
        console.log(chalk.yellow('No users with stripeCustomerId found.'))
        return
      }

      console.log(chalk.blue(`Auditing ${users.length} user(s)...`))

      const results: any[] = []
      let fixCount = 0

      for (const u of users) {
        process.stdout.write(`Checking ${u.email}... `)

        try {
          // List subscriptions for this customer
          const subscriptions = await stripe.subscriptions.list({
            customer: u.stripeCustomerId!,
            status: 'all',
            expand: ['data.default_payment_method']
          })

          // Find active or trialing subscription
          const activeSub = subscriptions.data.find((s) =>
            ['active', 'trialing', 'past_due', 'unpaid'].includes(s.status)
          )

          let stripeTier: 'FREE' | 'SUPPORTER' | 'PRO' = 'FREE'
          let stripeStatus = 'NONE'
          let stripePeriodEnd: Date | null = null
          let stripeSubId: string | null = null

          if (activeSub) {
            stripeSubId = activeSub.id
            stripeStatus = activeSub.status.toUpperCase()
            stripePeriodEnd = new Date(activeSub.current_period_end * 1000)

            // Determine tier from items
            const priceId = activeSub.items.data[0]?.price.id
            if (priceIds.pro.includes(priceId)) {
              stripeTier = 'PRO'
            } else if (priceIds.supporter.includes(priceId)) {
              stripeTier = 'SUPPORTER'
            }
          }

          const hasMismatch =
            u.subscriptionTier !== stripeTier ||
            u.subscriptionStatus !== stripeStatus ||
            (stripeSubId && u.stripeSubscriptionId !== stripeSubId)

          if (hasMismatch) {
            console.log(chalk.red('MISMATCH'))
            results.push({
              Email: u.email,
              'DB Tier': u.subscriptionTier,
              'Stripe Tier': stripeTier,
              'DB Status': u.subscriptionStatus,
              'Stripe Status': stripeStatus,
              'DB Sub ID': u.stripeSubscriptionId
                ? `${u.stripeSubscriptionId.substring(0, 8)}...`
                : 'NONE',
              'Stripe Sub ID': stripeSubId ? `${stripeSubId.substring(0, 8)}...` : 'NONE'
            })

            if (fix) {
              await prisma.user.update({
                where: { id: u.id },
                data: {
                  subscriptionTier: stripeTier,
                  subscriptionStatus: stripeStatus as any,
                  subscriptionPeriodEnd: stripePeriodEnd,
                  stripeSubscriptionId: stripeSubId
                }
              })
              fixCount++
            }
          } else {
            console.log(chalk.green('OK'))
          }
        } catch (err: any) {
          console.log(chalk.yellow(`ERROR: ${err.message}`))
        }
      }

      if (results.length > 0) {
        console.log('\n' + chalk.bold('Discrepancies Found:'))
        console.table(results)

        if (fix) {
          console.log(chalk.green(`\n✅ Fixed ${fixCount} user(s).`))
        } else {
          console.log(
            chalk.yellow(`\nFound ${results.length} discrepancy(ies). Run with --fix to resolve.`)
          )
        }
      } else {
        console.log(chalk.green('\n✅ No discrepancies found. All users are in sync with Stripe.'))
      }
    } catch (e: any) {
      console.error(chalk.red('\nFatal Error:'), e.message)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default syncCommand
