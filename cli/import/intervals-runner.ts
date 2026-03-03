import chalk from 'chalk'
import 'dotenv/config'

function parseDateInput(value: string, label: string): Date {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    console.error(chalk.red(`Invalid ${label}: ${value}. Expected a valid date string.`))
    process.exit(1)
  }
  return parsed
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim()
  )
}

async function main() {
  const args = process.argv.slice(2)
  const userIdentifier = args[0]

  if (!userIdentifier) {
    console.error(chalk.red('Missing user identifier.'))
    process.exit(1)
  }

  const options = {
    startDate: undefined as string | undefined,
    endDate: undefined as string | undefined,
    years: '10',
    skipPlanned: false,
    skipActivities: false,
    skipWellness: false,
    skipExisting: false
  }

  for (let i = 1; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--start-date') options.startDate = args[++i]
    else if (arg === '--end-date') options.endDate = args[++i]
    else if (arg === '--years') options.years = args[++i] || options.years
    else if (arg === '--skip-planned') options.skipPlanned = true
    else if (arg === '--skip-activities') options.skipActivities = true
    else if (arg === '--skip-wellness') options.skipWellness = true
    else if (arg === '--skip-existing') options.skipExisting = true
  }

  if (!process.env.DATABASE_URL) {
    console.error(chalk.red('DATABASE_URL is not set for the import runner.'))
    process.exit(1)
  }

  console.log(chalk.yellow('Using configured database connection.'))

  const years = Number.parseInt(String(options.years), 10)
  if (!options.startDate && (!Number.isFinite(years) || years <= 0)) {
    console.error(chalk.red(`Invalid --years value: ${options.years}`))
    process.exit(1)
  }

  const now = new Date()
  const startDate = options.startDate
    ? parseDateInput(options.startDate, 'start date')
    : new Date(Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate()))
  const endDate = options.endDate
    ? parseDateInput(options.endDate, 'end date')
    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  if (startDate > endDate) {
    console.error(chalk.red('Start date must be before end date.'))
    process.exit(1)
  }

  const { prisma } = await import('../../server/utils/db')
  const { IntervalsService } = await import('../../server/utils/services/intervalsService')

  try {
    const user = isUuidLike(userIdentifier)
      ? await prisma.user.findUnique({
          where: { id: userIdentifier },
          select: {
            id: true,
            email: true,
            name: true
          }
        })
      : await prisma.user.findUnique({
          where: { email: userIdentifier },
          select: {
            id: true,
            email: true,
            name: true
          }
        })

    if (!user) {
      console.error(chalk.red(`User not found: ${userIdentifier}`))
      process.exit(1)
    }

    const integration = await prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId: user.id,
          provider: 'intervals'
        }
      },
      select: {
        id: true,
        ingestWorkouts: true,
        lastSyncAt: true,
        syncStatus: true,
        externalUserId: true
      }
    })

    if (!integration) {
      console.error(chalk.red(`Intervals integration not found for user ${user.email}`))
      process.exit(1)
    }

    console.log(chalk.cyan('\n=== Intervals CLI Import ==='))
    console.log(`User:         ${chalk.white(user.email)} (${user.id})`)
    console.log(`Name:         ${chalk.white(user.name || 'Unknown')}`)
    console.log(`Athlete ID:   ${chalk.white(integration.externalUserId || 'OAuth/0')}`)
    console.log(`Sync Status:  ${chalk.white(integration.syncStatus || 'UNKNOWN')}`)
    console.log(`Last Sync:    ${chalk.white(integration.lastSyncAt?.toISOString() || 'Never')}`)
    console.log(`Workouts On:  ${chalk.white(integration.ingestWorkouts ? 'Yes' : 'No')}`)
    console.log(`Start Date:   ${chalk.white(startDate.toISOString())}`)
    console.log(`End Date:     ${chalk.white(endDate.toISOString())}`)
    console.log(`Skip Existing:${chalk.white(options.skipExisting ? ' Yes' : ' No')}`)

    const startedAt = Date.now()
    const counts = {
      plannedWorkouts: 0,
      events: 0,
      notes: 0,
      workouts: 0,
      wellness: 0
    }

    if (!options.skipPlanned) {
      console.log(chalk.blue('\nSyncing planned workouts/events/notes...'))
      const planned = await IntervalsService.syncPlannedWorkouts(user.id, startDate, endDate, {
        skipExisting: options.skipExisting
      })
      counts.plannedWorkouts = planned.plannedWorkouts
      counts.events = planned.events
      counts.notes = planned.notes
      console.log(
        chalk.green(
          `✓ Planned import complete (${planned.plannedWorkouts} workouts, ${planned.events} events, ${planned.notes} notes)`
        )
      )
    } else {
      console.log(chalk.gray('\nSkipping planned workouts/events/notes import.'))
    }

    if (!options.skipActivities) {
      console.log(chalk.blue('\nSyncing activities...'))
      counts.workouts = await IntervalsService.syncActivities(user.id, startDate, endDate, {
        skipExisting: options.skipExisting
      })
      console.log(chalk.green(`✓ Activity import complete (${counts.workouts} new workouts)`))
    } else {
      console.log(chalk.gray('\nSkipping activity import.'))
    }

    if (!options.skipWellness) {
      console.log(chalk.blue('\nSyncing wellness...'))
      counts.wellness = await IntervalsService.syncWellness(user.id, startDate, endDate, {
        skipExisting: options.skipExisting
      })
      console.log(chalk.green(`✓ Wellness import complete (${counts.wellness} new entries)`))
    } else {
      console.log(chalk.gray('\nSkipping wellness import.'))
    }

    const durationSec = Math.round((Date.now() - startedAt) / 1000)

    console.log(chalk.cyan('\n=== Import Summary ==='))
    console.log(`Planned Workouts: ${chalk.white(String(counts.plannedWorkouts))}`)
    console.log(`Events:           ${chalk.white(String(counts.events))}`)
    console.log(`Notes:            ${chalk.white(String(counts.notes))}`)
    console.log(`Workouts:         ${chalk.white(String(counts.workouts))}`)
    console.log(`Wellness:         ${chalk.white(String(counts.wellness))}`)
    console.log(`Duration:         ${chalk.white(`${durationSec}s`)}`)
  } catch (error) {
    console.error(chalk.red('\nIntervals CLI import failed:'), error)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

await main()
