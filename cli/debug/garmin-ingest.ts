import { Command } from 'commander'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import chalk from 'chalk'
import {
  fetchGarminDailies,
  fetchGarminSleeps,
  fetchGarminHRV,
  fetchGarminActivities
} from '../../server/utils/garmin'
import { GarminService } from '../../server/utils/services/garminService'

const garminIngestCommand = new Command('garmin-ingest')
  .description('Debug Garmin ingestion for a user')
  .argument('<userIdentifier>', 'User ID or Email')
  .option('--prod', 'Use production database')
  .option('--days <number>', 'Number of days to sync back', '1')
  .option('--skip-process', 'Only fetch data, do not process/save to DB')
  .option('--backfill', 'Trigger a backfill request (Asynchronous via Webhook)')
  .option('--pull-token <token>', 'Manual Pull Token from Garmin UI for direct pull testing')
  .action(async (userIdentifier, options) => {
    const isProd = options.prod
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (!connectionString) {
      console.error(chalk.red('Missing DATABASE_URL or DATABASE_URL_PROD in environment'))
      process.exit(1)
    }

    if (isProd) {
      process.env.DATABASE_URL = process.env.DATABASE_URL_PROD
      console.log(chalk.yellow('Using PRODUCTION database.'))
    } else {
      console.log(chalk.blue('Using DEVELOPMENT database.'))
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })
    ;(globalThis as any).prismaGlobalV2 = prisma

    try {
      console.log(chalk.blue(`Finding user: ${userIdentifier}...`))
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ id: userIdentifier }, { email: userIdentifier }]
        }
      })

      if (!user) {
        console.error(chalk.red('User not found'))
        return
      }

      console.log(chalk.green('✓ Found User:'), user.email, `(${user.id})`)

      const integration = await prisma.integration.findUnique({
        where: {
          userId_provider: {
            userId: user.id,
            provider: 'garmin'
          }
        }
      })

      if (!integration) {
        console.error(chalk.red('Garmin integration not found for this user'))
        return
      }

      console.log(chalk.green('✓ Found Garmin Integration'))
      console.log(`- External User ID: ${integration.externalUserId}`)

      // 1. Check Permissions & User ID
      console.log(chalk.blue('\nChecking Garmin API Status...'))
      const { fetchGarminData } = await import('../../server/utils/garmin')

      const commonParams = options.pullToken ? { token: options.pullToken } : {}

      try {
        const userIdRes = await fetchGarminData(
          integration as any,
          'https://apis.garmin.com/wellness-api/rest/user/id',
          commonParams
        )
        console.log(`${chalk.green('✓')} User ID: ${chalk.cyan(userIdRes.userId)}`)
      } catch (e: any) {
        console.log(`${chalk.red('✘')} User ID Check Failed: ${e.message}`)
      }

      try {
        const permsRes = await fetchGarminData(
          integration as any,
          'https://apis.garmin.com/wellness-api/rest/user/permissions',
          commonParams
        )
        console.log(`${chalk.green('✓')} Permissions: ${chalk.cyan(JSON.stringify(permsRes))}`)
      } catch (e: any) {
        console.log(`${chalk.red('✘')} Permissions Check Failed: ${e.message}`)
      }

      const days = parseInt(options.days)
      const now = Math.floor(Date.now() / 1000) - 60
      let startTimestamp = now - days * 86400
      const endTimestamp = now

      if (options.backfill) {
        console.log(chalk.blue('\nTriggering Asynchronous Backfill...'))
        console.log(
          `- Range: ${new Date(startTimestamp * 1000).toISOString()} to ${new Date(endTimestamp * 1000).toISOString()}`
        )

        const { requestGarminBackfill } = await import('../../server/utils/garmin')

        const types: Array<'activities' | 'dailies' | 'sleeps' | 'hrv'> = [
          'activities',
          'dailies',
          'sleeps',
          'hrv'
        ]

        for (const type of types) {
          process.stdout.write(`- Requesting ${type}... `)
          try {
            const res = await requestGarminBackfill(
              integration as any,
              type,
              startTimestamp,
              endTimestamp
            )
            if (res.success) {
              console.log(chalk.green('Accepted (202)'))
            } else {
              console.log(chalk.yellow(`Skipped: ${res.message}`))
            }
          } catch (e: any) {
            console.log(chalk.red(`Failed: ${e.message}`))
          }
        }

        console.log(
          chalk.bold.cyan('\nBackfill requests sent. Check your webhook logs for incoming data.')
        )
        return
      }

      // Enforce Garmin 24h limit for summaries if more than 1 day requested
      // (Though backfill API allows more, our fetchers use the summary endpoints)
      if (endTimestamp - startTimestamp > 86400) {
        console.log(
          chalk.yellow(
            `! Requested range (${days} days) exceeds Garmin 24h limit for summary endpoints.`
          )
        )
        console.log(chalk.yellow(`! Fetching only the last 24 hours to avoid 400 errors.`))
        startTimestamp = endTimestamp - 86400
      }

      console.log(
        chalk.blue(
          `\nStarting Direct Pull Data Fetch${options.pullToken ? ' (Using Manual Token)' : ' (Experimental/May Fail)'}...`
        )
      )
      console.log(
        `- Range: ${new Date(startTimestamp * 1000).toISOString()} to ${new Date(endTimestamp * 1000).toISOString()}`
      )

      const results = await Promise.allSettled([
        fetchGarminDailies(integration as any, startTimestamp, endTimestamp, options.pullToken),
        fetchGarminSleeps(integration as any, startTimestamp, endTimestamp, options.pullToken),
        fetchGarminHRV(integration as any, startTimestamp, endTimestamp, options.pullToken),
        fetchGarminActivities(integration as any, startTimestamp, endTimestamp, options.pullToken)
      ])

      const dailies = results[0].status === 'fulfilled' ? (results[0].value as any[]) : []
      const sleeps = results[1].status === 'fulfilled' ? (results[1].value as any[]) : []
      const hrv = results[2].status === 'fulfilled' ? (results[2].value as any[]) : []
      const activities = results[3].status === 'fulfilled' ? (results[3].value as any[]) : []

      console.log(chalk.bold('\n--- Fetch Results ---'))
      const labels = ['Dailies', 'Sleeps', 'HRV', 'Activities']
      results.forEach((result, index) => {
        const label = labels[index]
        if (result.status === 'fulfilled') {
          const count = (result.value as any[]).length
          console.log(`${chalk.green('✓')} ${label}: ${chalk.cyan(count)} records fetched`)
        } else {
          console.log(
            `${chalk.red('✘')} ${label}: ${chalk.red('FAILED')} - ${result.reason.message}`
          )
        }
      })

      if (options.skipProcess) {
        console.log(chalk.yellow('\nSkipping processing/database updates as requested.'))
        return
      }

      console.log(chalk.blue('\nProcessing Data...'))

      if (dailies.length > 0) {
        process.stdout.write(`- Processing Dailies (${dailies.length})... `)
        await GarminService.processWellness(user.id, dailies)
        console.log(chalk.green('Done'))
      }

      if (sleeps.length > 0) {
        process.stdout.write(`- Processing Sleeps (${sleeps.length})... `)
        await GarminService.processSleep(user.id, sleeps)
        console.log(chalk.green('Done'))
      }

      if (hrv.length > 0) {
        process.stdout.write(`- Processing HRV (${hrv.length})... `)
        await GarminService.processHRV(user.id, hrv)
        console.log(chalk.green('Done'))
      }

      if (activities.length > 0) {
        process.stdout.write(`- Processing Activities (${activities.length})... `)
        // We pass the integration from the local Prisma instance
        await GarminService.processActivities(user.id, activities, integration as any)
        console.log(chalk.green('Done'))
      }

      console.log(chalk.bold.green('\nIngestion completed successfully!'))
    } catch (error: any) {
      console.error(chalk.red('\nFatal Error:'), error.message)
      if (error.stack) console.error(chalk.gray(error.stack))
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default garminIngestCommand
