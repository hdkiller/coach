import { Command } from 'commander'
import chalk from 'chalk'
import Table from 'cli-table3'
import { prisma } from '../../server/utils/db'

const DURATIONS = [5, 10, 30, 60, 120, 300, 600, 1200, 1800, 3600]
const VALIDATION_PCT = 0.97

const FRESHNESS_THRESHOLDS = {
  fresh: 30,
  aging: 90
}

type FreshnessState = 'fresh' | 'aging' | 'stale' | 'unknown'

function getDaysSince(date: Date | null, now: Date): number | null {
  if (!date) return null
  const msInDay = 24 * 60 * 60 * 1000
  return Math.floor((now.getTime() - date.getTime()) / msInDay)
}

function getFreshnessState(daysSince: number | null): FreshnessState {
  if (daysSince === null) return 'unknown'
  if (daysSince <= FRESHNESS_THRESHOLDS.fresh) return 'fresh'
  if (daysSince <= FRESHNESS_THRESHOLDS.aging) return 'aging'
  return 'stale'
}

function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  return `${Math.floor(seconds / 3600)}h`
}

function calculateBestPowerForDuration(powerData: number[], durationSec: number): number {
  if (!Array.isArray(powerData) || powerData.length < durationSec) return 0

  let maxAvg = 0
  let rolling = 0

  for (let i = 0; i < powerData.length; i++) {
    rolling += powerData[i] || 0
    if (i >= durationSec) rolling -= powerData[i - durationSec] || 0

    if (i >= durationSec - 1) {
      const avg = rolling / durationSec
      if (avg > maxAvg) maxAvg = avg
    }
  }

  return Math.round(maxAvg)
}

function buildSportTypeWhere(sport?: string) {
  if (!sport || sport === 'all') return undefined

  const cyclingTypes = ['Ride', 'VirtualRide', 'MountainBikeRide', 'GravelRide', 'EBikeRide']
  const runningTypes = ['Run', 'VirtualRun', 'TrailRun']

  if (cyclingTypes.includes(sport)) return { in: cyclingTypes }
  if (runningTypes.includes(sport)) return { in: runningTypes }
  return sport
}

const curveFreshnessCommand = new Command('curve-freshness')
  .description('Debug power curve freshness + FTP freshness/evolution diagnostics for a user')
  .argument('[email_or_id]', 'User email or id', 'lracz@newpush.com')
  .option('--sport <sport>', 'Sport type filter (e.g. VirtualRide, Run, all)', 'VirtualRide')
  .option('--days <days>', 'Current period days for power curve', '90')
  .action(async (emailOrId: string, options: { sport: string; days: string }) => {
    try {
      const now = new Date()
      const days = Number(options.days) || 90
      const sport = options.sport
      const sportTypeWhere = buildSportTypeWhere(sport)

      const user = await prisma.user.findFirst({
        where: {
          OR: [{ email: emailOrId }, { id: emailOrId }]
        },
        select: {
          id: true,
          email: true,
          ftp: true
        }
      })

      if (!user) {
        console.error(chalk.red(`User not found: ${emailOrId}`))
        process.exit(1)
      }

      console.log(chalk.bold.cyan('\n=== Curve Freshness Debug ==='))
      console.log(`User: ${chalk.bold(user.email)}`)
      console.log(`Sport filter: ${chalk.bold(sport)} -> ${JSON.stringify(sportTypeWhere)}`)
      console.log(`Current period: ${days} days`)
      console.log(`Now: ${now.toISOString()}`)

      const currentStart = new Date(now)
      currentStart.setDate(now.getDate() - days)
      const allTimeStart = new Date(now)
      allTimeStart.setDate(now.getDate() - 730)

      const [currentWorkouts, allTimeWorkouts] = await Promise.all([
        prisma.workout.findMany({
          where: {
            userId: user.id,
            isDuplicate: false,
            date: { gte: currentStart, lte: now },
            type: sportTypeWhere as any
          },
          select: {
            id: true,
            date: true,
            type: true,
            streams: { select: { watts: true } }
          },
          orderBy: { date: 'asc' }
        }),
        prisma.workout.findMany({
          where: {
            userId: user.id,
            isDuplicate: false,
            date: { gte: allTimeStart, lte: now },
            type: sportTypeWhere as any
          },
          select: {
            id: true,
            date: true,
            type: true,
            streams: { select: { watts: true } }
          },
          orderBy: { date: 'asc' }
        })
      ])

      console.log(
        `Workouts: current=${chalk.bold(String(currentWorkouts.length))}, allTime=${chalk.bold(String(allTimeWorkouts.length))}`
      )
      console.log(
        `With watts stream: current=${chalk.bold(String(currentWorkouts.filter((w) => Array.isArray(w.streams?.watts) && (w.streams?.watts as any[]).length > 0).length))}, allTime=${chalk.bold(String(allTimeWorkouts.filter((w) => Array.isArray(w.streams?.watts) && (w.streams?.watts as any[]).length > 0).length))}`
      )

      const allTimeBestByDuration = new Map<number, number>()
      const allTimeLastValidatingByDuration = new Map<number, Date | null>()

      DURATIONS.forEach((duration) => {
        let best = 0
        let lastValidating: Date | null = null

        allTimeWorkouts.forEach((w) => {
          const watts = w.streams?.watts as number[] | undefined
          if (!Array.isArray(watts) || watts.length === 0) return
          const val = calculateBestPowerForDuration(watts, duration)
          if (val > best) best = val
        })

        allTimeWorkouts.forEach((w) => {
          const watts = w.streams?.watts as number[] | undefined
          if (!Array.isArray(watts) || watts.length === 0 || best <= 0) return
          const val = calculateBestPowerForDuration(watts, duration)
          if (val >= best * VALIDATION_PCT) {
            const d = new Date(w.date)
            if (!lastValidating || d > lastValidating) lastValidating = d
          }
        })

        allTimeBestByDuration.set(duration, best)
        allTimeLastValidatingByDuration.set(duration, lastValidating)
      })

      const curveTable = new Table({
        head: [
          chalk.gray('Duration'),
          chalk.gray('Current'),
          chalk.gray('All-Time'),
          chalk.gray('Last Validating'),
          chalk.gray('Days Ago'),
          chalk.gray('State')
        ]
      })

      DURATIONS.forEach((duration) => {
        let currentBest = 0
        let currentLastValidating: Date | null = null
        const allTimeBest = allTimeBestByDuration.get(duration) || 0

        currentWorkouts.forEach((w) => {
          const watts = w.streams?.watts as number[] | undefined
          if (!Array.isArray(watts) || watts.length === 0) return
          const val = calculateBestPowerForDuration(watts, duration)
          if (val > currentBest) currentBest = val
        })

        currentWorkouts.forEach((w) => {
          const watts = w.streams?.watts as number[] | undefined
          if (!Array.isArray(watts) || watts.length === 0 || allTimeBest <= 0) return
          const val = calculateBestPowerForDuration(watts, duration)
          if (val >= allTimeBest * VALIDATION_PCT) {
            const d = new Date(w.date)
            if (!currentLastValidating || d > currentLastValidating) currentLastValidating = d
          }
        })

        const lastValidating =
          currentLastValidating || allTimeLastValidatingByDuration.get(duration) || null
        const daysSince = getDaysSince(lastValidating, now)
        const state = getFreshnessState(daysSince)
        const stateColor =
          state === 'fresh'
            ? chalk.blue(state.toUpperCase())
            : state === 'aging'
              ? chalk.yellow(state.toUpperCase())
              : state === 'stale'
                ? chalk.red(state.toUpperCase())
                : chalk.gray(state.toUpperCase())

        curveTable.push([
          fmtDuration(duration),
          currentBest > 0 ? `${currentBest}W` : '-',
          allTimeBest > 0 ? `${allTimeBest}W` : '-',
          lastValidating ? lastValidating.toISOString().split('T')[0] : '-',
          daysSince ?? '-',
          stateColor
        ])
      })

      console.log(chalk.bold('\nPower Curve Freshness'))
      console.log(curveTable.toString())

      const latestFtpSnapshot = await prisma.workout.findFirst({
        where: {
          userId: user.id,
          isDuplicate: false,
          ftp: { not: null },
          type: sportTypeWhere as any
        },
        select: {
          ftp: true,
          date: true
        },
        orderBy: { date: 'desc' }
      })

      const ftp = user.ftp || latestFtpSnapshot?.ftp || null
      console.log(chalk.bold('\nFTP Freshness Diagnostics'))
      console.log(
        `Current FTP (resolved): ${ftp ? chalk.bold(`${ftp}W`) : chalk.yellow('not set')}`
      )
      console.log(
        `Source: ${
          user.ftp
            ? 'user profile'
            : latestFtpSnapshot?.ftp
              ? `latest workout snapshot (${new Date(latestFtpSnapshot.date).toISOString().split('T')[0]})`
              : 'none'
        }`
      )

      if (!ftp) return

      const ftpValidationLookbackStart = new Date(now)
      ftpValidationLookbackStart.setDate(now.getDate() - 365)

      const ftpWorkouts = await prisma.workout.findMany({
        where: {
          userId: user.id,
          isDuplicate: false,
          date: { gte: ftpValidationLookbackStart, lte: now },
          type: sportTypeWhere as any
        },
        select: {
          id: true,
          date: true,
          title: true,
          type: true,
          durationSec: true,
          normalizedPower: true,
          averageWatts: true,
          ftp: true,
          streams: { select: { watts: true } }
        },
        orderBy: { date: 'desc' }
      })

      const threshold = ftp * VALIDATION_PCT
      let lastValidatingEffortDate: Date | null = null
      let candidateCount = 0

      const topRows: Array<[string, string, string, string, string]> = []

      ftpWorkouts.forEach((w) => {
        const watts = w.streams?.watts as number[] | undefined
        const fallbackPower = w.normalizedPower || w.averageWatts || 0
        const durationSec = w.durationSec || 0

        const stream20m = Array.isArray(watts) ? calculateBestPowerForDuration(watts, 1200) : 0
        const stream30m = Array.isArray(watts) ? calculateBestPowerForDuration(watts, 1800) : 0
        const stream60m = Array.isArray(watts) ? calculateBestPowerForDuration(watts, 3600) : 0

        const best20m = Math.max(stream20m, durationSec >= 1200 ? fallbackPower : 0)
        const best30m = Math.max(stream30m, durationSec >= 1800 ? fallbackPower : 0)
        const best60m = Math.max(stream60m, durationSec >= 3600 ? fallbackPower : 0)
        const ftpEquivalent = Math.max(best20m * 0.95, best30m * 0.93, best60m)

        if (ftpEquivalent >= threshold) {
          candidateCount++
          const d = new Date(w.date)
          if (!lastValidatingEffortDate || d > lastValidatingEffortDate) {
            lastValidatingEffortDate = d
          }
        }

        if (topRows.length < 8) {
          topRows.push([
            new Date(w.date).toISOString().split('T')[0],
            w.type || '-',
            `${Math.round(ftpEquivalent)}W`,
            `${Math.round(threshold)}W`,
            ftpEquivalent >= threshold ? chalk.green('YES') : chalk.gray('NO')
          ])
        }
      })

      const ftpDaysSince = getDaysSince(lastValidatingEffortDate, now)
      const ftpState = getFreshnessState(ftpDaysSince)

      console.log(
        `Validation threshold: ${Math.round(threshold)}W (${Math.round(VALIDATION_PCT * 100)}% of FTP)`
      )
      console.log(`Workouts checked (365d): ${ftpWorkouts.length}`)
      console.log(`Validating candidates: ${candidateCount}`)
      console.log(
        `Last validating effort: ${lastValidatingEffortDate ? lastValidatingEffortDate.toISOString().split('T')[0] : 'none'}`
      )
      console.log(
        `Freshness state: ${chalk.bold(ftpState.toUpperCase())} (${ftpDaysSince ?? 'n/a'}d)`
      )

      const ftpTable = new Table({
        head: [
          chalk.gray('Date'),
          chalk.gray('Type'),
          chalk.gray('FTP-Equiv'),
          chalk.gray('Threshold'),
          chalk.gray('Validates')
        ]
      })
      topRows.forEach((r) => ftpTable.push(r))
      console.log('\nRecent FTP validation candidates:')
      console.log(ftpTable.toString())

      const ftpEvolutionPoints = await prisma.workout.findMany({
        where: {
          userId: user.id,
          isDuplicate: false,
          ftp: { not: null },
          type: sportTypeWhere as any
        },
        select: {
          date: true,
          ftp: true
        },
        orderBy: { date: 'asc' }
      })
      const uniqueFtpValues = [...new Set(ftpEvolutionPoints.map((w) => w.ftp).filter(Boolean))]
      console.log(chalk.bold('\nFTP Evolution Snapshot Diagnostics'))
      console.log(`Snapshot points: ${ftpEvolutionPoints.length}`)
      console.log(
        `Unique FTP values in snapshots: ${uniqueFtpValues.length} (${uniqueFtpValues.join(', ') || 'none'})`
      )
      if (uniqueFtpValues.length <= 1) {
        console.log(
          chalk.yellow(
            'Flat line is expected: there are no historical FTP snapshot changes for this sport filter.'
          )
        )
      }
    } catch (error: any) {
      console.error(chalk.red('Failed to run curve-freshness debug:'), error?.message || error)
      process.exit(1)
    }
  })

export default curveFreshnessCommand
