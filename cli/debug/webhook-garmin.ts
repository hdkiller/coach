import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'

const garminWebhookCommand = new Command('garmin')
  .description('Trigger a mock Garmin webhook event for testing')
  .option('--prod', 'Use production URL')
  .option('--url <url>', 'Override the webhook URL')
  .option('--external-user <id>', 'Garmin External User ID', '0db20509-029f-4a45-ada0-fc230913f3b3')
  .option('--type <type>', 'Metric type (activities, dailies, sleeps, hrv)', 'activities')
  .action(async (options) => {
    let baseUrl = options.url
    if (!baseUrl) {
      if (options.prod) {
        baseUrl = 'https://coachwatts.com'
      } else {
        baseUrl = process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      }
    }

    // Ensure baseUrl doesn't end with slash
    baseUrl = baseUrl.replace(/\/$/, '')
    const webhookUrl = `${baseUrl}/api/webhooks/garmin`

    const now = Math.floor(Date.now() / 1000)

    let payload: any = {}

    if (options.type === 'activities') {
      payload = {
        activities: [
          {
            userId: options.externalUser,
            summaryId: `MOCK_ACT_${now}`,
            activityType: 'RUNNING',
            activityName: 'Mock Morning Run',
            startTimeInSeconds: now - 3600,
            durationInSeconds: 3600,
            distanceInMeters: 10000,
            averageHeartRateInBeatsPerMinute: 155,
            activeKilocalories: 750
          }
        ]
      }
    } else if (options.type === 'dailies') {
      payload = {
        dailies: [
          {
            userId: options.externalUser,
            summaryId: `MOCK_DAILY_${now}`,
            calendarDate: new Date().toISOString().split('T')[0],
            startTimeInSeconds: now - 86400,
            durationInSeconds: 86400,
            steps: 12500,
            restingHeartRateInBeatsPerMinute: 52,
            averageStressLevel: 25
          }
        ]
      }
    } else if (options.type === 'sleeps') {
      payload = {
        sleeps: [
          {
            userId: options.externalUser,
            summaryId: `MOCK_SLEEP_${now}`,
            calendarDate: new Date().toISOString().split('T')[0],
            startTimeInSeconds: now - 30000,
            durationInSeconds: 28800,
            overallSleepScore: { value: 85 }
          }
        ]
      }
    } else if (options.type === 'hrv') {
      payload = {
        hrv: [
          {
            userId: options.externalUser,
            summaryId: `MOCK_HRV_${now}`,
            calendarDate: new Date().toISOString().split('T')[0],
            startTimeInSeconds: now - 30000,
            lastNightAvg: 65
          }
        ]
      }
    }

    console.log(chalk.blue(`Triggering Garmin mock webhook at: ${chalk.bold(webhookUrl)}`))
    console.log(chalk.gray(`External User ID: ${options.externalUser}`))
    console.log(chalk.gray(`Type: ${options.type}`))
    console.log(chalk.gray('Payload:'), JSON.stringify(payload, null, 2))

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Garmin Health API Mock'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        console.log(
          chalk.green(`✔ Mock webhook triggered successfully (Status: ${response.status})`)
        )
        console.log(chalk.cyan('Check your server/worker logs to verify processing.'))
      } else {
        const text = await response.text()
        console.error(chalk.red(`✘ Failed to trigger webhook (${response.status}): ${text}`))
      }
    } catch (error: any) {
      console.error(chalk.red(`✘ Error: ${error.message}`))
    }
  })

export default garminWebhookCommand
