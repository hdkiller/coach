import { Command } from 'commander'
import Table from 'cli-table3'
import chalk from 'chalk'
import { prisma } from '../../server/utils/db'
import { getUserTimezone, getUserLocalDate, formatDateUTC } from '../../server/utils/date'
import { metabolicService } from '../../server/utils/services/metabolicService'

/**
 * Replays real athlete days through the metabolic model and reports how the model behaves in
 * aggregate, so the physiological constants can be tuned against evidence rather than argument.
 *
 * The headline number is the clipping rate. Whenever the tank pins at 0% or 100% the model has
 * saturated and thrown away information, so a high rate means the drain, the capacity or the
 * intake assumptions are out of balance - and it says so without needing a ground truth to
 * compare against.
 */

type DaySummary = {
  dateKey: string
  min: number
  max: number
  end: number
  clippedLow: number
  clippedHigh: number
  points: number
  hasLogs: boolean
  workouts: number
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round((p / 100) * (sorted.length - 1)))
  )
  return sorted[index]!
}

function bar(value: number, max: number, width = 24): string {
  if (max <= 0) return ''
  const filled = Math.max(0, Math.min(width, Math.round((value / max) * width)))
  return '█'.repeat(filled) + '·'.repeat(width - filled)
}

const replayModelCommand = new Command('replay-model')
  .description('Replay historical days through the metabolic model and report its behaviour')
  .argument('[email]', 'User email (defaults to every user with nutrition data)')
  .option('-d, --days <number>', 'Days of history to replay', '28')
  .option('-u, --users <number>', 'Maximum users to sample when no email is given', '10')
  .option('--verbose', 'Print a row per day', false)
  .action(async (email: string | undefined, options) => {
    const days = Math.max(1, Number(options.days) || 28)
    const maxUsers = Math.max(1, Number(options.users) || 10)

    const users = email
      ? await prisma.user.findMany({ where: { email } })
      : await prisma.user.findMany({
          where: { nutrition: { some: {} } },
          take: maxUsers,
          orderBy: { createdAt: 'asc' }
        })

    if (users.length === 0) {
      console.error(chalk.red('No users found with nutrition data.'))
      return
    }

    console.log(
      chalk.blue(
        `Replaying ${days} days for ${users.length} user(s) through the metabolic model...\n`
      )
    )

    const allDays: DaySummary[] = []
    const handoffErrors: number[] = []
    const flooredHandoffs: number[] = []

    for (const user of users) {
      const timezone = await getUserTimezone(user.id)
      const today = getUserLocalDate(timezone)
      const start = new Date(today)
      start.setUTCDate(today.getUTCDate() - days)

      let wave
      try {
        wave = await metabolicService.getWaveRange(user.id, start, today)
      } catch (error: any) {
        console.error(chalk.red(`  ${user.email}: replay failed - ${error?.message || error}`))
        continue
      }

      const byDay = new Map<string, any[]>()
      for (const point of wave.points as any[]) {
        const key = String(point.dateKey || '')
        if (!key) continue
        if (!byDay.has(key)) byDay.set(key, [])
        byDay.get(key)!.push(point)
      }

      const nutritionRows = await prisma.nutrition.findMany({
        where: { userId: user.id, date: { gte: start, lte: today } },
        select: { date: true, breakfast: true, lunch: true, dinner: true, snacks: true }
      })
      const logged = new Set(
        nutritionRows
          .filter((row) =>
            (['breakfast', 'lunch', 'dinner', 'snacks'] as const).some(
              (meal) => Array.isArray(row[meal]) && (row[meal] as any[]).length > 0
            )
          )
          .map((row) => formatDateUTC(row.date))
      )

      const workoutCounts = new Map<string, number>()
      for (const workout of (wave.workouts || []) as any[]) {
        const key = formatDateUTC(new Date(workout.date))
        workoutCounts.set(key, (workoutCounts.get(key) || 0) + 1)
      }

      const orderedKeys = [...byDay.keys()].sort()
      let previousEnd: number | null = null
      let previousHadLogs = false

      for (const dateKey of orderedKeys) {
        const points = byDay.get(dateKey)!
        const levels = points.map((p) => Number(p.level))

        const summary: DaySummary = {
          dateKey,
          min: Math.min(...levels),
          max: Math.max(...levels),
          end: levels[levels.length - 1]!,
          clippedLow: levels.filter((l) => l <= 0).length,
          clippedHigh: levels.filter((l) => l >= 100).length,
          points: levels.length,
          hasLogs: logged.has(dateKey),
          workouts: workoutCounts.get(dateKey) || 0
        }
        allDays.push(summary)

        // The chain hands yesterday's ending level to today's start; a healthy model carries it
        // across without a step. Days with no intake data are deliberately floored at the metabolic
        // baseline before being handed on, so a step there is intended rather than a fault - it is
        // measured separately so it cannot mask a genuine discontinuity.
        if (previousEnd !== null) {
          const gap = Math.abs(levels[0]! - previousEnd)
          if (previousHadLogs) handoffErrors.push(gap)
          else flooredHandoffs.push(gap)
        }
        previousEnd = summary.end
        previousHadLogs = summary.hasLogs
      }

      if (options.verbose) {
        const table = new Table({
          head: ['Date', 'Min', 'Max', 'End', 'Clip lo', 'Clip hi', 'Logs', 'Wk'].map((h) =>
            chalk.cyan(h)
          )
        })
        for (const day of allDays.filter((d) => orderedKeys.includes(d.dateKey))) {
          table.push([
            day.dateKey,
            `${day.min}%`,
            `${day.max}%`,
            `${day.end}%`,
            day.clippedLow ? chalk.red(String(day.clippedLow)) : '0',
            day.clippedHigh ? chalk.yellow(String(day.clippedHigh)) : '0',
            day.hasLogs ? 'y' : '-',
            String(day.workouts)
          ])
        }
        console.log(chalk.bold(`\n${user.email}`))
        console.log(table.toString())
      }
    }

    if (allDays.length === 0) {
      console.error(chalk.red('No days replayed.'))
      return
    }

    const totalPoints = allDays.reduce((sum, d) => sum + d.points, 0)
    const clippedLowPoints = allDays.reduce((sum, d) => sum + d.clippedLow, 0)
    const clippedHighPoints = allDays.reduce((sum, d) => sum + d.clippedHigh, 0)
    const daysHittingZero = allDays.filter((d) => d.min <= 0).length
    const daysHittingFull = allDays.filter((d) => d.max >= 100).length

    const mins = allDays.map((d) => d.min)
    const ends = allDays.map((d) => d.end)

    console.log(chalk.bold('\n═══ Model behaviour ═══\n'))

    const summary = new Table()
    summary.push(
      ['Days replayed', String(allDays.length)],
      ['Intervals', String(totalPoints)],
      [
        chalk.bold('Clipping at 0%'),
        `${((clippedLowPoints / totalPoints) * 100).toFixed(1)}% of intervals · ${daysHittingZero}/${allDays.length} days`
      ],
      [
        chalk.bold('Clipping at 100%'),
        `${((clippedHighPoints / totalPoints) * 100).toFixed(1)}% of intervals · ${daysHittingFull}/${allDays.length} days`
      ],
      [
        chalk.bold('Chain handoff error, logged days'),
        `median ${percentile(handoffErrors, 50).toFixed(1)} · p90 ${percentile(handoffErrors, 90).toFixed(1)} pts (${handoffErrors.length} transitions)`
      ],
      [
        'Deliberate floor steps, unlogged days',
        `median ${percentile(flooredHandoffs, 50).toFixed(1)} · p90 ${percentile(flooredHandoffs, 90).toFixed(1)} pts (${flooredHandoffs.length} transitions)`
      ],
      [
        'Daily minimum (p10 / median / p90)',
        `${percentile(mins, 10)}% / ${percentile(mins, 50)}% / ${percentile(mins, 90)}%`
      ],
      [
        'Day-end level (p10 / median / p90)',
        `${percentile(ends, 10)}% / ${percentile(ends, 50)}% / ${percentile(ends, 90)}%`
      ]
    )
    console.log(summary.toString())

    console.log(chalk.bold('\nDistribution of daily minimum\n'))
    const buckets = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90]
    const counts = buckets.map(
      (lower) => allDays.filter((d) => d.min >= lower && d.min < lower + 10).length
    )
    const maxCount = Math.max(...counts, 1)
    buckets.forEach((lower, i) => {
      const label = `${String(lower).padStart(3)}-${String(lower + 9).padStart(3)}%`
      const colour = lower < 20 ? chalk.red : lower < 40 ? chalk.yellow : chalk.green
      console.log(`  ${colour(label)}  ${bar(counts[i]!, maxCount)}  ${counts[i]}`)
    })

    console.log(
      chalk.dim('\nA healthy model rarely pins at either end. Frequent 0% means the drain')
    )
    console.log(
      chalk.dim('is too aggressive or capacity too low; frequent 100% means the reverse.')
    )

    await prisma.$disconnect()
  })

export default replayModelCommand
