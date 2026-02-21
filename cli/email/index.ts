import { Command } from 'commander'
import { sendEmail } from '../../server/utils/email'
import chalk from 'chalk'
import { tasks } from '@trigger.dev/sdk/v3'
import { prisma } from '../../server/utils/db'

const emailCommand = new Command('email')

emailCommand.description('Email management tools')

emailCommand
  .command('send')
  .description('Send a test email directly via Resend')
  .requiredOption('--to <email>', 'Recipient email')
  .requiredOption('--subject <subject>', 'Email subject')
  .requiredOption('--body <body>', 'Email body (HTML)')
  .option('--from <email>', 'Sender email (overrides env var)')
  .action(async (options) => {
    console.log(chalk.blue('Sending email...'))
    try {
      const response = await sendEmail({
        to: options.to,
        from: options.from,
        subject: options.subject,
        html: options.body
      })
      console.log(chalk.green('Email sent successfully!'))
      console.log(response)
    } catch (error: any) {
      console.error(chalk.red('Failed to send email:'), error.message)
      process.exit(1)
    }
    process.exit(0)
  })

emailCommand
  .command('queue-welcome')
  .description('Queue a test Welcome email to a user for manual admin review')
  .argument('<userId>', 'User ID to send the email to')
  .action(async (userId) => {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      console.error(`User ${userId} not found`)
      return
    }

    console.log(`Queueing Welcome email for ${user.email}...`)

    await tasks.trigger('send-email', {
      userId: user.id,
      templateKey: 'Welcome',
      eventKey: 'CLI_TEST',
      audience: 'TRANSACTIONAL',
      subject: 'Welcome to Coach Watts!',
      props: {
        name: user.name || 'Athlete',
        unsubscribeUrl: 'https://app.coachwatts.com/settings/profile'
      }
    })

    console.log('Task triggered successfully! Check the Admin > Emails page.')
    process.exit(0)
  })

emailCommand
  .command('queue-analysis')
  .description('Queue a test Workout Analysis email')
  .argument('<userId>', 'User ID')
  .action(async (userId) => {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      console.error(`User ${userId} not found`)
      return
    }

    console.log(`Queueing Workout Analysis email for ${user.email}...`)

    await tasks.trigger('send-email', {
      userId: user.id,
      templateKey: 'WorkoutAnalysisReady',
      eventKey: 'CLI_TEST_ANALYSIS',
      audience: 'ENGAGEMENT',
      subject: 'Workout Analysis Ready: Threshold Intervals',
      props: {
        name: user.name || 'Athlete',
        workoutTitle: 'Threshold Intervals',
        overallScore: 8,
        unsubscribeUrl: 'https://app.coachwatts.com/settings/profile'
      }
    })

    console.log('Task triggered successfully! Check the Admin > Emails page.')
    process.exit(0)
  })

emailCommand
  .command('queue-subscription')
  .description('Queue a test Subscription Started email')
  .argument('<userId>', 'User ID')
  .action(async (userId) => {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      console.error(`User ${userId} not found`)
      return
    }

    console.log(`Queueing Subscription Started email for ${user.email}...`)

    await tasks.trigger('send-email', {
      userId: user.id,
      templateKey: 'SubscriptionStarted',
      eventKey: 'CLI_TEST_SUBSCRIPTION',
      audience: 'TRANSACTIONAL',
      subject: 'Welcome to Coach Watts Pro!',
      props: {
        name: user.name || 'Athlete',
        tier: 'PRO',
        unsubscribeUrl: 'https://app.coachwatts.com/settings/profile'
      }
    })

    console.log('Task triggered successfully! Check the Admin > Emails page.')
    process.exit(0)
  })

emailCommand
  .command('queue-daily-coach')
  .description('Queue a test Daily Recommendation email')
  .argument('<userId>', 'User ID')
  .action(async (userId) => {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      console.error(`User ${userId} not found`)
      return
    }

    console.log(`Queueing Daily Recommendation email for ${user.email}...`)

    await tasks.trigger('send-email', {
      userId: user.id,
      templateKey: 'DailyRecommendation',
      eventKey: 'CLI_TEST_DAILY_COACH',
      audience: 'ENGAGEMENT',
      subject: "Today's Training: PROCEED",
      props: {
        name: user.name || 'Athlete',
        date: 'Saturday, Feb 21',
        recommendation: 'PROCEED',
        reasoning:
          'Your TSB is in the building zone (-15) and your recovery score is excellent (88%). It is a great day for your planned interval session.',
        unsubscribeUrl: 'https://coachwatts.com/profile/settings?tab=communication'
      }
    })

    console.log('Task triggered successfully! Check the Admin > Emails page.')
    process.exit(0)
  })

export default emailCommand
