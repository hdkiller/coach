import { Command } from 'commander'
import { sendEmail } from '../../server/utils/email'
import chalk from 'chalk'
import { tasks } from '@trigger.dev/sdk/v3'
import { prisma } from '../../server/utils/db'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { config } from '@vue-email/compiler'
import { resolve } from 'path'
import { EMAIL_TEMPLATE_REGISTRY } from '../../server/utils/email-template-registry'
import { buildInterestingCopy } from '../../server/utils/workout-insight-email'

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
  .command('send-template')
  .description('Render and send a Vue email template directly via Resend')
  .requiredOption('--to <email>', 'Recipient email')
  .requiredOption(
    '--template <name>',
    'Template file name without .vue (e.g. WorkoutAnalysisReady)'
  )
  .option('--subject <subject>', 'Override email subject')
  .option('--props <json>', 'JSON object for template props')
  .option('--from <email>', 'Sender email (overrides env var)')
  .action(async (options) => {
    const emailDir = resolve(process.cwd(), 'app/emails')
    const templateFile = `${options.template}.vue`
    let parsedProps: Record<string, any> = {}

    if (options.props) {
      try {
        parsedProps = JSON.parse(options.props)
      } catch (error) {
        console.error(chalk.red('Invalid --props JSON.'))
        process.exit(1)
      }
    }

    try {
      console.log(chalk.blue(`Rendering template ${options.template} via internal API...`))
      const baseUrl = process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      const internalApiToken = process.env.INTERNAL_API_TOKEN
      if (!internalApiToken) throw new Error('INTERNAL_API_TOKEN is missing')

      const renderRes = await fetch(`${baseUrl}/api/internal/render-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-api-token': internalApiToken },
        body: JSON.stringify({ templateKey: options.template, props: parsedProps })
      })

      if (!renderRes.ok) throw new Error(`Render API failed: ${await renderRes.text()}`)
      const rendered: any = await renderRes.json()

      console.log(chalk.blue('Sending email...'))
      const response = await sendEmail({
        to: options.to,
        from: options.from,
        subject: options.subject || `[Template Test] ${options.template}`,
        html: rendered.html,
        text: rendered.text
      })

      console.log(chalk.green('Template email sent successfully!'))
      console.log(response)
    } catch (error: any) {
      console.error(chalk.red('Failed to send template email:'), error.message)
      process.exit(1)
    }

    process.exit(0)
  })

function inferSportCategory(type?: string | null): 'run' | 'ride' | 'other' {
  if (!type) return 'other'
  const normalized = type.toLowerCase()
  if (normalized.includes('run') || normalized.includes('jog') || normalized.includes('trail'))
    return 'run'
  if (
    normalized.includes('ride') ||
    normalized.includes('cycle') ||
    normalized.includes('bike') ||
    normalized.includes('cycling')
  )
    return 'ride'
  return 'other'
}

function formatDurationShort(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes} min`
}

function formatWorkoutDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  })
}

emailCommand
  .command('send-workout-received-test')
  .description('Send a WorkoutReceived-style test email from an existing workout ID')
  .requiredOption('--workout-id <id>', 'Workout ID')
  .requiredOption('--to <email>', 'Recipient email')
  .option('--subject <subject>', 'Override email subject')
  .option('--from <email>', 'Sender email (overrides env var)')
  .option('--prod', 'Use DATABASE_URL_PROD instead of default DATABASE_URL')
  .option('--site-url <url>', 'Workout link base URL', 'https://coachwatts.com')
  .action(
    async (options: {
      workoutId: string
      to: string
      subject?: string
      from?: string
      prod?: boolean
      siteUrl: string
    }) => {
      const targetDatabaseUrl = options.prod
        ? process.env.DATABASE_URL_PROD
        : process.env.DATABASE_URL
      if (!targetDatabaseUrl) {
        console.error(
          chalk.red(options.prod ? 'DATABASE_URL_PROD is not set' : 'DATABASE_URL is not set')
        )
        process.exit(1)
      }

      let db: PrismaClient = prisma as unknown as PrismaClient
      let pool: pg.Pool | null = null

      if (options.prod) {
        console.log(chalk.yellow('Using PRODUCTION database (DATABASE_URL_PROD)'))
        pool = new pg.Pool({ connectionString: targetDatabaseUrl })
        const adapter = new PrismaPg(pool)
        db = new PrismaClient({ adapter })
      } else {
        console.log(chalk.blue('Using default database (DATABASE_URL)'))
      }

      try {
        const workout = await db.workout.findUnique({
          where: { id: options.workoutId },
          select: {
            id: true,
            userId: true,
            title: true,
            date: true,
            type: true,
            durationSec: true,
            distanceMeters: true,
            elevationGain: true,
            averageCadence: true,
            averageHr: true,
            maxHr: true,
            averageWatts: true,
            normalizedPower: true,
            tss: true,
            kilojoules: true,
            calories: true,
            user: {
              select: {
                name: true
              }
            }
          }
        })

        if (!workout) {
          console.error(chalk.red(`Workout not found: ${options.workoutId}`))
          process.exit(1)
        }

        const tssWindowStart = new Date(workout.date)
        tssWindowStart.setDate(tssWindowStart.getDate() - 27)
        const recentTssRows = await db.workout.findMany({
          where: {
            userId: workout.userId,
            isDuplicate: false,
            date: {
              gte: tssWindowStart,
              lte: workout.date
            }
          },
          select: {
            date: true,
            tss: true
          }
        })

        const tss28d = recentTssRows.reduce((sum, row) => sum + (row.tss || 0), 0)
        const start7d = new Date(workout.date)
        start7d.setDate(start7d.getDate() - 6)
        const tss7d = recentTssRows.reduce((sum, row) => {
          return row.date >= start7d ? sum + (row.tss || 0) : sum
        }, 0)
        const workoutsLast7Days = recentTssRows.filter((row) => row.date >= start7d).length
        const weeklyTssBaseline28d = tss28d > 0 ? Math.round(tss28d / 4) : 0
        const loadDeltaPct =
          weeklyTssBaseline28d > 0
            ? Math.round(((tss7d - weeklyTssBaseline28d) / weeklyTssBaseline28d) * 100)
            : null

        const sportCategory = inferSportCategory(workout.type)
        const cadenceUnit = sportCategory === 'ride' ? 'rpm' : 'spm'
        const distanceKm = workout.distanceMeters
          ? Math.round((workout.distanceMeters / 1000) * 10) / 10
          : null
        const durationText = formatDurationShort(workout.durationSec)
        const dateText = formatWorkoutDate(workout.date)
        const athleteName = workout.user?.name || 'Athlete'
        const workoutUrl = `${options.siteUrl.replace(/\/$/, '')}/workouts/${workout.id}`

        const distanceLabel = distanceKm ? `${distanceKm} km` : null
        const { heroTitle, introLine, previewLine } = buildInterestingCopy({
          workoutId: workout.id,
          sportCategory,
          workoutTitle: workout.title || 'Workout',
          firstName: athleteName.split(' ')[0],
          distanceLabel,
          tss: workout.tss || undefined,
          loadDeltaPct: loadDeltaPct === null ? undefined : loadDeltaPct,
          workoutsLast7Days
        })

        const subject = options.subject || `[Test] Workout Synced: ${workout.title}`

        const emailDir = resolve(process.cwd(), 'app/emails')
        const renderer = config(emailDir)
        const rendered = await renderer.render('WorkoutReceived.vue', {
          props: {
            name: athleteName,
            workoutId: workout.id,
            workoutTitle: workout.title || 'Workout',
            workoutDate: dateText,
            workoutType: workout.type || undefined,
            durationMinutes: workout.durationSec ? Math.round(workout.durationSec / 60) : undefined,
            distanceKm: distanceKm || undefined,
            elevationGain: workout.elevationGain || undefined,
            averageCadence: workout.averageCadence || undefined,
            cadenceUnit,
            averageHr: workout.averageHr || undefined,
            maxHr: workout.maxHr || undefined,
            averageWatts: workout.averageWatts || undefined,
            normalizedPower: workout.normalizedPower || undefined,
            tss: workout.tss ? Math.round(workout.tss) : undefined,
            tss7d: tss7d ? Math.round(tss7d) : undefined,
            weeklyTssBaseline28d: weeklyTssBaseline28d || undefined,
            loadDeltaPct: loadDeltaPct === null ? undefined : loadDeltaPct,
            kilojoules: workout.kilojoules || undefined,
            calories: workout.calories || undefined,
            workoutUrl,
            unsubscribeUrl: `${options.siteUrl.replace(/\/$/, '')}/profile/settings?tab=communication`,
            shareUrl: `${options.siteUrl.replace(/\/$/, '')}/workouts/${workout.id}?share=true`,
            chatUrl: `${options.siteUrl.replace(/\/$/, '')}/chat?workoutId=${workout.id}`,
            heroTitle,
            introLine,
            previewLine
          }
        })

        const html = rendered.html
        const text = rendered.text

        console.log(chalk.blue(`Sending test email for workout ${workout.id} to ${options.to}...`))
        const response = await sendEmail({
          to: options.to,
          from: options.from,
          subject,
          html,
          text
        })

        console.log(chalk.green('WorkoutReceived test email sent successfully!'))
        console.log(response)
      } catch (error: any) {
        console.error(chalk.red('Failed to send workout test email:'), error.message)
        process.exit(1)
      } finally {
        if (pool) {
          await db.$disconnect()
          await pool.end()
        }
      }

      process.exit(0)
    }
  )

emailCommand
  .command('troubleshoot-workout')
  .description('Diagnose why workout insight emails were (or were not) queued for a workout')
  .argument('<workoutId>', 'Workout ID to inspect')
  .option('--prod', 'Use DATABASE_URL_PROD instead of default DATABASE_URL')
  .option('--source <source>', 'Analysis source context (AUTOMATIC or MANUAL)', 'AUTOMATIC')
  .action(async (workoutId: string, options: { source: string; prod?: boolean }) => {
    const source = String(options.source || 'AUTOMATIC').toUpperCase()
    if (source !== 'AUTOMATIC' && source !== 'MANUAL') {
      console.error(chalk.red('Invalid --source. Use AUTOMATIC or MANUAL.'))
      process.exit(1)
    }

    if (options.prod && !process.env.DATABASE_URL_PROD) {
      console.error(chalk.red('DATABASE_URL_PROD is not set'))
      process.exit(1)
    }

    const targetDatabaseUrl = options.prod
      ? process.env.DATABASE_URL_PROD
      : process.env.DATABASE_URL
    if (!targetDatabaseUrl) {
      console.error(chalk.red('Target database URL is not set'))
      process.exit(1)
    }

    if (options.prod) {
      console.log(chalk.yellow('Using PRODUCTION database (DATABASE_URL_PROD)'))
    } else {
      console.log(chalk.blue('Using default database (DATABASE_URL)'))
    }

    const pool = new pg.Pool({ connectionString: targetDatabaseUrl })
    const adapter = new PrismaPg(pool)
    const db = new PrismaClient({ adapter })

    const workout = await db.workout.findUnique({
      where: { id: workoutId },
      include: {
        exercises: {
          select: { id: true },
          take: 1
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            timezone: true,
            aiAutoAnalyzeWorkouts: true
          }
        }
      }
    })

    if (!workout) {
      console.error(chalk.red(`Workout not found: ${workoutId}`))
      await db.$disconnect()
      await pool.end()
      process.exit(1)
    }

    const [emailPref, suppression, linkedDeliveries, recentDeliveries] = await Promise.all([
      db.emailPreference.findUnique({
        where: { userId_channel: { userId: workout.userId, channel: 'EMAIL' } }
      }),
      db.emailSuppression.findFirst({
        where: { email: workout.user.email, active: true },
        orderBy: { updatedAt: 'desc' }
      }),
      db.emailDelivery.findMany({
        where: {
          OR: [
            { idempotencyKey: `workout-insights:${workout.id}` },
            { eventKey: `WORKOUT_RECEIVED_${workout.id}` },
            { eventKey: `WORKOUT_INSIGHTS_READY_${workout.id}` },
            {
              metadata: {
                path: ['workoutId'],
                equals: workout.id
              } as any
            }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      db.emailDelivery.findMany({
        where: { userId: workout.userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          createdAt: true,
          templateKey: true,
          status: true,
          subject: true,
          idempotencyKey: true
        }
      })
    ])

    const hasData =
      (workout.durationSec || 0) > 0 ||
      (workout.distanceMeters || 0) > 0 ||
      (workout.averageWatts || 0) > 0 ||
      (workout.averageHr || 0) > 0 ||
      (workout.exercises?.length || 0) > 0

    const now = new Date()
    const isFutureDated = workout.date > now

    const template = EMAIL_TEMPLATE_REGISTRY.WorkoutAnalysisReady
    const throttleTemplateKeys = Object.values(EMAIL_TEMPLATE_REGISTRY)
      .filter((entry) => entry.throttleGroup && entry.throttleGroup === template.throttleGroup)
      .map((entry) => entry.templateKey)
    const lookbackFrom = new Date(now.getTime() - (template.cooldownHours || 0) * 60 * 60 * 1000)
    const activeStatuses = ['QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED']

    const cooldownBlockingDelivery =
      template.cooldownHours && template.cooldownHours > 0
        ? await db.emailDelivery.findFirst({
            where: {
              userId: workout.userId,
              templateKey: {
                in: throttleTemplateKeys.length ? throttleTemplateKeys : [template.templateKey]
              },
              createdAt: { gte: lookbackFrom },
              status: { in: activeStatuses as any }
            },
            orderBy: { createdAt: 'desc' }
          })
        : null

    const blockers: string[] = []

    if (source === 'AUTOMATIC' && !workout.user.aiAutoAnalyzeWorkouts) {
      blockers.push('AUTO_ANALYZE_DISABLED: user.aiAutoAnalyzeWorkouts=false')
    }
    if (isFutureDated) {
      blockers.push('FUTURE_DATE: workout.date is in the future')
    }
    if (!hasData) {
      blockers.push('EMPTY_SESSION: no duration/distance/power/hr/exercises found')
    }
    if (!emailPref) {
      blockers.push(
        'NO_EMAIL_PREFERENCE_ROW: automatic analyze email trigger requires existing EmailPreference row'
      )
    } else {
      if (emailPref.globalUnsubscribe) {
        blockers.push('GLOBAL_UNSUBSCRIBE: EmailPreference.globalUnsubscribe=true')
      }
      if (!emailPref.workoutAnalysis) {
        blockers.push('WORKOUT_ANALYSIS_DISABLED: EmailPreference.workoutAnalysis=false')
      }
    }
    if (suppression) {
      blockers.push(`SUPPRESSED: EmailSuppression active (reason=${suppression.reason})`)
    }
    if (cooldownBlockingDelivery) {
      blockers.push(
        `COOLDOWN_ACTIVE: recent ${cooldownBlockingDelivery.templateKey} (${cooldownBlockingDelivery.status}) at ${cooldownBlockingDelivery.createdAt.toISOString()}`
      )
    }

    console.log(chalk.cyan('\n=== Workout Email Troubleshooting ==='))
    console.log(`Workout ID: ${workout.id}`)
    console.log(`User: ${workout.user.name || 'Unknown'} <${workout.user.email}>`)
    console.log(`Source Context: ${source}`)
    console.log(`Workout Date: ${workout.date.toISOString()}`)
    console.log(`AI Analysis Status: ${workout.aiAnalysisStatus}`)
    console.log(`Auto Analyze Enabled: ${workout.user.aiAutoAnalyzeWorkouts ? 'yes' : 'no'}`)
    console.log(`Has Data For Analysis: ${hasData ? 'yes' : 'no'}`)
    console.log(`Email Preference Row Exists: ${emailPref ? 'yes' : 'no'}`)
    if (emailPref) {
      console.log(`  workoutAnalysis: ${emailPref.workoutAnalysis ? 'on' : 'off'}`)
      console.log(`  globalUnsubscribe: ${emailPref.globalUnsubscribe ? 'on' : 'off'}`)
    }
    console.log(`Suppressed: ${suppression ? `yes (${suppression.reason})` : 'no'}`)
    console.log(`Linked EmailDelivery Rows: ${linkedDeliveries.length}`)

    if (linkedDeliveries.length > 0) {
      console.log(chalk.cyan('\nLinked deliveries (this workout):'))
      linkedDeliveries.forEach((d) => {
        console.log(
          `- ${d.createdAt.toISOString()} | ${d.templateKey} | ${d.status} | event=${d.eventKey} | idempotency=${d.idempotencyKey || '-'}`
        )
      })
    }

    console.log(chalk.cyan('\nRecent deliveries (user):'))
    if (!recentDeliveries.length) {
      console.log('- none')
    } else {
      recentDeliveries.forEach((d) => {
        console.log(
          `- ${d.createdAt.toISOString()} | ${d.templateKey} | ${d.status} | ${d.subject}`
        )
      })
    }

    if (blockers.length === 0) {
      console.log(chalk.green('\nNo obvious blockers detected from DB state.'))
      console.log(
        'If no email exists, check Trigger run logs for render/API errors and quota failures.'
      )
    } else {
      console.log(chalk.yellow('\nDetected blockers:'))
      blockers.forEach((b) => console.log(`- ${b}`))
    }

    await db.$disconnect()
    await pool.end()

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
