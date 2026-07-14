import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { PrismaClient, type SubscriptionTier } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import {
  getCampaignAvailability,
  normalizePartnerCampaignSlug,
  toPartnerCampaignPublicView
} from '../../server/utils/partner-campaigns'

function createPrisma(isProd: boolean) {
  const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL
  if (!connectionString) {
    console.error(chalk.red('Error: Database connection string is not defined.'))
    process.exit(1)
  }

  const pool = new pg.Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  return { prisma: new PrismaClient({ adapter }), pool }
}

function printProdWarning(isProd: boolean) {
  if (isProd) {
    console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))
  } else {
    console.log(chalk.blue('Using DEVELOPMENT database.'))
  }
}

function parseTier(value: string): SubscriptionTier {
  const normalized = value.toUpperCase()
  if (!['FREE', 'SUPPORTER', 'PRO'].includes(normalized)) {
    throw new Error(`Invalid tier: ${value}`)
  }
  return normalized as SubscriptionTier
}

const partnersCommand = new Command('partners').description('Partner campaign administration')

partnersCommand
  .command('create')
  .description('Create a partner campaign')
  .requiredOption('--slug <slug>', 'Unique campaign slug')
  .requiredOption('--partner-name <name>', 'Partner display name')
  .requiredOption('--campaign-name <name>', 'Campaign display name')
  .requiredOption('--granted-tier <tier>', 'Granted tier: FREE, SUPPORTER, or PRO')
  .requiredOption('--duration-days <days>', 'Access duration in days', (value) => Number(value))
  .requiredOption('--max-redemptions <count>', 'Maximum redemptions', (value) => Number(value))
  .option('--window-starts-at <iso>', 'Redemption window start (ISO timestamp)')
  .option('--window-ends-at <iso>', 'Redemption window end (ISO timestamp)')
  .option('--inactive', 'Create the campaign in disabled state')
  .option('--prod', 'Use production database')
  .action(async (options) => {
    const isProd = Boolean(options.prod)
    printProdWarning(isProd)
    const { prisma, pool } = createPrisma(isProd)

    try {
      const campaign = await prisma.partnerCampaign.create({
        data: {
          slug: normalizePartnerCampaignSlug(options.slug),
          partnerName: options.partnerName,
          campaignName: options.campaignName,
          grantedTier: parseTier(options.grantedTier),
          accessDurationDays: options.durationDays,
          maxRedemptions: options.maxRedemptions,
          windowStartsAt: options.windowStartsAt ? new Date(options.windowStartsAt) : null,
          windowEndsAt: options.windowEndsAt ? new Date(options.windowEndsAt) : null,
          isActive: !options.inactive
        }
      })

      console.log(chalk.green('✅ Partner campaign created.'))
      console.log(JSON.stringify(toPartnerCampaignPublicView(campaign), null, 2))
      console.log(chalk.cyan(`Public URL: https://coachwatts.com/partners/${campaign.slug}`))
    } catch (error) {
      console.error(chalk.red('Failed to create campaign:'), error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

partnersCommand
  .command('show')
  .description('Inspect a partner campaign')
  .argument('<slug>', 'Campaign slug')
  .option('--prod', 'Use production database')
  .action(async (slug, options) => {
    const isProd = Boolean(options.prod)
    printProdWarning(isProd)
    const { prisma, pool } = createPrisma(isProd)

    try {
      const campaign = await prisma.partnerCampaign.findUnique({
        where: { slug: normalizePartnerCampaignSlug(slug) }
      })

      if (!campaign) {
        console.log(chalk.yellow(`Campaign not found: ${slug}`))
        return
      }

      console.log(
        JSON.stringify(
          {
            ...toPartnerCampaignPublicView(campaign),
            isActive: campaign.isActive,
            createdAt: campaign.createdAt.toISOString(),
            updatedAt: campaign.updatedAt.toISOString()
          },
          null,
          2
        )
      )
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

partnersCommand
  .command('list')
  .description('List partner campaigns')
  .option('--prod', 'Use production database')
  .action(async (options) => {
    const isProd = Boolean(options.prod)
    printProdWarning(isProd)
    const { prisma, pool } = createPrisma(isProd)

    try {
      const campaigns = await prisma.partnerCampaign.findMany({
        orderBy: { createdAt: 'desc' }
      })

      console.table(
        campaigns.map((campaign) => ({
          slug: campaign.slug,
          partner: campaign.partnerName,
          tier: campaign.grantedTier,
          redemptions: `${campaign.redemptionCount}/${campaign.maxRedemptions}`,
          availability: getCampaignAvailability(campaign),
          active: campaign.isActive
        }))
      )
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

partnersCommand
  .command('disable')
  .description('Disable a partner campaign')
  .argument('<slug>', 'Campaign slug')
  .option('--prod', 'Use production database')
  .action(async (slug, options) => {
    const isProd = Boolean(options.prod)
    printProdWarning(isProd)
    const { prisma, pool } = createPrisma(isProd)

    try {
      const campaign = await prisma.partnerCampaign.update({
        where: { slug: normalizePartnerCampaignSlug(slug) },
        data: { isActive: false }
      })
      console.log(chalk.green(`Disabled campaign ${campaign.slug}`))
    } catch (error) {
      console.error(chalk.red('Failed to disable campaign:'), error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

partnersCommand
  .command('update-capacity')
  .description('Adjust campaign capacity or re-enable a campaign')
  .argument('<slug>', 'Campaign slug')
  .option('--max-redemptions <count>', 'New maximum redemptions', (value) => Number(value))
  .option('--enable', 'Re-enable a disabled campaign')
  .option('--prod', 'Use production database')
  .action(async (slug, options) => {
    const isProd = Boolean(options.prod)
    printProdWarning(isProd)
    const { prisma, pool } = createPrisma(isProd)

    try {
      const campaign = await prisma.partnerCampaign.update({
        where: { slug: normalizePartnerCampaignSlug(slug) },
        data: {
          ...(options.maxRedemptions ? { maxRedemptions: options.maxRedemptions } : {}),
          ...(options.enable ? { isActive: true } : {})
        }
      })
      console.log(chalk.green(`Updated campaign ${campaign.slug}`))
      console.log(
        JSON.stringify(
          {
            maxRedemptions: campaign.maxRedemptions,
            redemptionCount: campaign.redemptionCount,
            isActive: campaign.isActive
          },
          null,
          2
        )
      )
    } catch (error) {
      console.error(chalk.red('Failed to update campaign:'), error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

partnersCommand
  .command('user-grant')
  .description('Inspect a user promotional grant for support (no partner reporting)')
  .argument('<query>', 'User email or ID')
  .option('--prod', 'Use production database')
  .action(async (query, options) => {
    const isProd = Boolean(options.prod)
    printProdWarning(isProd)
    const { prisma, pool } = createPrisma(isProd)

    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ id: query }, { email: { equals: query, mode: 'insensitive' } }]
        },
        select: {
          id: true,
          email: true,
          subscriptionTier: true,
          subscriptionStatus: true,
          subscriptionPeriodEnd: true
        }
      })

      if (!user) {
        console.log(chalk.yellow(`User not found: ${query}`))
        return
      }

      const redemptions = await prisma.partnerCampaignRedemption.findMany({
        where: { userId: user.id },
        include: {
          campaign: {
            select: {
              slug: true,
              partnerName: true,
              campaignName: true
            }
          }
        },
        orderBy: { redeemedAt: 'desc' }
      })

      console.log(
        JSON.stringify(
          {
            user: {
              id: user.id,
              email: user.email,
              subscriptionTier: user.subscriptionTier,
              subscriptionStatus: user.subscriptionStatus,
              subscriptionPeriodEnd: user.subscriptionPeriodEnd?.toISOString() ?? null
            },
            grants: redemptions.map((redemption) => ({
              campaignSlug: redemption.campaign.slug,
              partnerName: redemption.campaign.partnerName,
              campaignName: redemption.campaign.campaignName,
              grantedTier: redemption.grantedTier,
              startsAt: redemption.startsAt.toISOString(),
              endsAt: redemption.endsAt.toISOString(),
              active: redemption.endsAt > new Date()
            }))
          },
          null,
          2
        )
      )
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default partnersCommand
