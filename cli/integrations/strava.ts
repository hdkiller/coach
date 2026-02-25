import { Command } from 'commander'
import chalk from 'chalk'
import {
  createStravaSubscription,
  listStravaSubscriptions,
  deleteStravaSubscription
} from '../../server/utils/strava'

export const stravaCommand = new Command('strava').description('Manage Strava integration')

stravaCommand
  .command('list-subs')
  .description('List Strava push subscriptions')
  .action(async () => {
    try {
      const subs = await listStravaSubscriptions()
      console.log(chalk.blue('--- Strava Webhook Subscriptions ---'))
      if (subs.length === 0) {
        console.log(chalk.yellow('No active subscriptions found.'))
      } else {
        subs.forEach((sub: any) => {
          console.log(chalk.green(`ID: ${sub.id}`))
          console.log(`  Callback URL: ${sub.callback_url}`)
          console.log(`  Created At: ${sub.created_at}`)
          console.log(`  Updated At: ${sub.updated_at}`)
        })
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message)
    }
  })

stravaCommand
  .command('create-sub')
  .description('Create a Strava push subscription')
  .option('--prod', 'Use production URL (coachwatts.com)')
  .option('--url <url>', 'Override callback URL')
  .option('--token <token>', 'Verification token (defaults to env STRAVA_WEBHOOK_VERIFY_TOKEN)')
  .action(async (options) => {
    let baseUrl = process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3099'
    if (options.prod) {
      baseUrl = 'https://coachwatts.com'
    } else if (options.url) {
      baseUrl = options.url
    }

    const callbackUrl = `${baseUrl.replace(/\/$/, '')}/api/integrations/strava/webhook`
    const verifyToken = options.token || process.env.STRAVA_WEBHOOK_VERIFY_TOKEN

    if (!verifyToken) {
      console.error(
        chalk.red(
          'Error: Missing verify token. Set STRAVA_WEBHOOK_VERIFY_TOKEN in .env or use --token.'
        )
      )
      return
    }

    console.log(chalk.blue(`Creating subscription with callback: ${callbackUrl}...`))

    try {
      const result = await createStravaSubscription(callbackUrl, verifyToken)
      console.log(chalk.green('✔ Successfully created subscription!'))
      console.log(chalk.cyan(`Subscription ID: ${result.id}`))
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message)
      console.log(
        chalk.yellow(
          '\nTip: Strava allows only ONE subscription per application. Use "list-subs" to check existing ones.'
        )
      )
    }
  })

stravaCommand
  .command('delete-sub <id>')
  .description('Delete a Strava push subscription')
  .action(async (id) => {
    try {
      await deleteStravaSubscription(parseInt(id))
      console.log(chalk.green(`✔ Successfully deleted subscription ${id}`))
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message)
    }
  })
