import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { format } from 'date-fns'
import {
  calculateProjectedPMC,
  getCurrentFitnessSummary,
  getFormStatus
} from '../../server/utils/training-stress'
import { generateTrainingContext } from '../../server/utils/training-metrics'
import { formatDateUTC, formatUserDate, getUserLocalDate } from '../../server/utils/date'

const formCommand = new Command('form')

type LatestSource = {
  kind: 'wellness' | 'workout'
  date: Date
  ctl: number
  atl: number
  label: string
}

function buildPrisma(connectionString: string) {
  const pool = new pg.Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

function reverseEWMA(currentValue: number, todayTSS: number, timeConstant: number): number {
  const numerator = timeConstant * currentValue - todayTSS
  const denominator = timeConstant - 1
  return denominator > 0 ? numerator / denominator : currentValue
}

function formatMetricLine(label: string, value: number) {
  return `${label.padEnd(14)} ${chalk.white(value.toFixed(1))}`
}

function printSection(title: string) {
  console.log(chalk.bold.cyan(`\n=== ${title} ===`))
}

async function resolveUser(prisma: PrismaClient, identifier: string) {
  let user = await prisma.user.findUnique({
    where: { id: identifier },
    select: { id: true, email: true, name: true, timezone: true }
  })

  if (!user) {
    user = await prisma.user.findUnique({
      where: { email: identifier },
      select: { id: true, email: true, name: true, timezone: true }
    })
  }

  return user
}

async function getLatestSource(prisma: PrismaClient, userId: string): Promise<LatestSource | null> {
  const [latestWellness, latestWorkout] = await Promise.all([
    prisma.wellness.findFirst({
      where: {
        userId,
        ctl: { not: null },
        atl: { not: null }
      },
      orderBy: { date: 'desc' },
      select: { date: true, ctl: true, atl: true }
    }),
    prisma.workout.findFirst({
      where: {
        userId,
        isDuplicate: false,
        ctl: { not: null },
        atl: { not: null }
      },
      orderBy: { date: 'desc' },
      select: { date: true, ctl: true, atl: true, title: true }
    })
  ])

  const wellnessDay = latestWellness?.date ? formatDateUTC(latestWellness.date) : ''
  const workoutDay = latestWorkout?.date ? formatDateUTC(latestWorkout.date) : ''

  if (latestWellness && (wellnessDay >= workoutDay || !latestWorkout)) {
    return {
      kind: 'wellness',
      date: latestWellness.date,
      ctl: latestWellness.ctl ?? 0,
      atl: latestWellness.atl ?? 0,
      label: 'Wellness'
    }
  }

  if (latestWorkout) {
    return {
      kind: 'workout',
      date: latestWorkout.date,
      ctl: latestWorkout.ctl ?? 0,
      atl: latestWorkout.atl ?? 0,
      label: latestWorkout.title ? `Workout: ${latestWorkout.title}` : 'Workout'
    }
  }

  return null
}

formCommand
  .description('Explain current CTL/ATL/TSB for a user, including planned-load adjustments')
  .argument('<user_id_or_email>', 'User UUID or email')
  .option('--prod', 'Use production database')
  .option('--days <days>', 'Projection window in days', '7')
  .action(async (identifier, options) => {
    const isProd = options.prod
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (!connectionString) {
      console.error(
        chalk.red(isProd ? 'DATABASE_URL_PROD is not defined.' : 'DATABASE_URL is not defined.')
      )
      process.exit(1)
    }

    console.log(
      isProd
        ? chalk.yellow('Using PRODUCTION database.')
        : chalk.blue('Using DEVELOPMENT database.')
    )

    const prisma = buildPrisma(connectionString)

    try {
      const user = await resolveUser(prisma, identifier)

      if (!user) {
        console.error(chalk.red(`User not found: ${identifier}`))
        process.exit(1)
      }

      const timezone = user.timezone || 'UTC'
      const todayDate = getUserLocalDate(timezone)
      const projectionDays = Math.max(1, parseInt(options.days, 10) || 7)

      const [latestSource, plannedForToday, futurePlanned, rawSummary, adjustedSummary] =
        await Promise.all([
          getLatestSource(prisma, user.id),
          prisma.plannedWorkout.findMany({
            where: {
              userId: user.id,
              date: todayDate,
              completed: { not: true },
              completionStatus: { not: 'COMPLETED' },
              completedWorkouts: { none: {} }
            },
            orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
            select: {
              id: true,
              title: true,
              type: true,
              date: true,
              tss: true,
              durationSec: true
            }
          }),
          prisma.plannedWorkout.findMany({
            where: {
              userId: user.id,
              date: {
                gte: todayDate,
                lte: new Date(todayDate.getTime() + projectionDays * 24 * 60 * 60 * 1000)
              },
              completed: { not: true },
              completionStatus: { not: 'COMPLETED' },
              completedWorkouts: { none: {} }
            },
            orderBy: { date: 'asc' },
            select: { date: true, tss: true }
          }),
          getCurrentFitnessSummary(user.id, prisma, { timezone }),
          getCurrentFitnessSummary(user.id, prisma, {
            timezone,
            adjustForTodayUncompletedPlannedTSS: true
          })
        ])

      const thirtyDaysAgo = new Date(todayDate)
      thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30)
      const rawTrainingContext = await generateTrainingContext(user.id, thirtyDaysAgo, todayDate, {
        includeZones: false,
        timezone
      })
      const adjustedTrainingContext = await generateTrainingContext(
        user.id,
        thirtyDaysAgo,
        todayDate,
        {
          includeZones: false,
          timezone,
          adjustForTodayUncompletedPlannedTSS: true
        }
      )

      const pendingPlannedTSS = plannedForToday.reduce(
        (sum, workout) => sum + (workout.tss || 0),
        0
      )
      const manuallyReversed =
        latestSource &&
        formatDateUTC(latestSource.date) === formatDateUTC(todayDate) &&
        pendingPlannedTSS > 0
          ? {
              ctl: reverseEWMA(latestSource.ctl, pendingPlannedTSS, 42),
              atl: reverseEWMA(latestSource.atl, pendingPlannedTSS, 7)
            }
          : null

      const projected = calculateProjectedPMC(
        todayDate,
        new Date(todayDate.getTime() + projectionDays * 24 * 60 * 60 * 1000),
        adjustedSummary.ctl,
        adjustedSummary.atl,
        futurePlanned
      )

      printSection('User')
      console.log(`Name:           ${chalk.white(user.name || 'N/A')}`)
      console.log(`Email:          ${chalk.white(user.email || 'N/A')}`)
      console.log(`ID:             ${chalk.gray(user.id)}`)
      console.log(`Timezone:       ${chalk.magenta(timezone)}`)
      console.log(
        `Local Today:    ${chalk.white(formatUserDate(todayDate, timezone, 'yyyy-MM-dd'))}`
      )

      printSection('Latest Source Record')
      if (!latestSource) {
        console.log(chalk.yellow('No latest CTL/ATL source found.'))
      } else {
        console.log(`Source:         ${chalk.white(latestSource.label)} (${latestSource.kind})`)
        console.log(
          `Updated:        ${chalk.white(formatUserDate(latestSource.date, timezone, 'yyyy-MM-dd HH:mm'))}`
        )
        console.log(formatMetricLine('Raw CTL:', latestSource.ctl))
        console.log(formatMetricLine('Raw ATL:', latestSource.atl))
        console.log(formatMetricLine('Raw TSB:', latestSource.ctl - latestSource.atl))
      }

      printSection("Today's Unfinished Planned Workouts")
      console.log(`Pending TSS:    ${chalk.white(pendingPlannedTSS.toFixed(1))}`)
      if (plannedForToday.length === 0) {
        console.log(chalk.gray('None'))
      } else {
        for (const workout of plannedForToday) {
          const durationMinutes =
            typeof workout.durationSec === 'number' ? Math.round(workout.durationSec / 60) : null
          console.log(
            `- ${workout.title || workout.type || 'Untitled'} | TSS ${chalk.white((workout.tss || 0).toFixed(1))}${durationMinutes ? ` | ${durationMinutes} min` : ''}`
          )
        }
      }

      printSection('Current Fitness Summary')
      console.log(chalk.gray('Raw app summary (no planned-load correction):'))
      console.log(formatMetricLine('CTL:', rawSummary.ctl))
      console.log(formatMetricLine('ATL:', rawSummary.atl))
      console.log(formatMetricLine('TSB:', rawSummary.tsb))
      console.log(
        `Status:         ${chalk.white(rawSummary.formStatus.status)} - ${rawSummary.formStatus.description}`
      )

      console.log(chalk.gray('\nPre-workout summary (unfinished planned load removed):'))
      console.log(formatMetricLine('CTL:', adjustedSummary.ctl))
      console.log(formatMetricLine('ATL:', adjustedSummary.atl))
      console.log(formatMetricLine('TSB:', adjustedSummary.tsb))
      console.log(
        `Status:         ${chalk.white(adjustedSummary.formStatus.status)} - ${adjustedSummary.formStatus.description}`
      )

      if (manuallyReversed) {
        console.log(chalk.gray('\nManual reverse-check from latest source + pending planned TSS:'))
        console.log(formatMetricLine('CTL:', manuallyReversed.ctl))
        console.log(formatMetricLine('ATL:', manuallyReversed.atl))
        console.log(formatMetricLine('TSB:', manuallyReversed.ctl - manuallyReversed.atl))
      }

      printSection('Prompt-Facing Training Context')
      console.log(chalk.gray('generateTrainingContext (raw):'))
      console.log(formatMetricLine('CTL:', rawTrainingContext.loadTrend.currentCTL ?? 0))
      console.log(formatMetricLine('ATL:', rawTrainingContext.loadTrend.currentATL ?? 0))
      console.log(formatMetricLine('TSB:', rawTrainingContext.loadTrend.currentTSB ?? 0))

      console.log(chalk.gray('\ngenerateTrainingContext (pre-workout corrected):'))
      console.log(formatMetricLine('CTL:', adjustedTrainingContext.loadTrend.currentCTL ?? 0))
      console.log(formatMetricLine('ATL:', adjustedTrainingContext.loadTrend.currentATL ?? 0))
      console.log(formatMetricLine('TSB:', adjustedTrainingContext.loadTrend.currentTSB ?? 0))

      printSection(`Projection Preview (${projectionDays} Days)`)
      if (projected.length === 0) {
        console.log(chalk.gray('No projected data.'))
      } else {
        for (const day of projected.slice(0, Math.min(projected.length, projectionDays + 1))) {
          const status = getFormStatus(day.tsb)
          console.log(
            `${format(day.date, 'yyyy-MM-dd')} | CTL ${day.ctl.toFixed(1)} | ATL ${day.atl.toFixed(1)} | TSB ${day.tsb.toFixed(1)} | TSS ${day.tss.toFixed(1)} | ${status.status}`
          )
        }
      }

      printSection('How To Use')
      console.log(
        `Run: ${chalk.white(`pnpm cw:cli debug form ${user.id} ${isProd ? '--prod' : ''}`.trim())}`
      )
      console.log(
        chalk.gray('Compare "Raw app summary" vs "Pre-workout summary" to confirm the fix.')
      )
    } catch (error) {
      console.error(chalk.red('Error while inspecting current form:'), error)
      process.exitCode = 1
    } finally {
      await prisma.$disconnect()
    }
  })

export default formCommand
