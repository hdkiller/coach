import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import {
  detectIntervals,
  findPeakEfforts,
  calculateHeartRateRecovery,
  calculateAerobicDecoupling
} from '../../server/utils/interval-detection'
import Table from 'cli-table3'

const intervalsDebugCommand = new Command('intervals')
  .description('Debug workout intervals and detection logic')
  .argument('<id>', 'Workout ID (UUID)')
  .option('--prod', 'Use production database')
  .action(async (id, options) => {
    const isProd = options.prod
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (isProd) {
      process.env.DATABASE_URL = connectionString
      console.log(chalk.yellow('Using PRODUCTION database.'))
    } else {
      console.log(chalk.blue('Using DEVELOPMENT database.'))
    }

    const { prisma } = await import('../../server/utils/db')

    try {
      console.log(chalk.blue(`Fetching workout ${id}...`))
      const workout = await prisma.workout.findUnique({
        where: { id },
        include: {
          user: true,
          streams: true,
          plannedWorkout: true
        }
      })

      if (!workout) {
        console.error(chalk.red('Workout not found'))
        return
      }

      console.log(chalk.green(`✓ Found Workout: ${workout.title}`))
      console.log(`- Date: ${workout.date.toISOString().split('T')[0]}`)
      console.log(`- Type: ${workout.type}`)
      console.log(`- Source: ${workout.source}`)
      console.log(`- FTP: ${workout.ftp || workout.user?.ftp || 'Not set'}`)

      const raw = workout.rawJson as any
      const icuIntervals = raw?.icu_intervals || raw?.intervals || []
      console.log(chalk.bold(`\n--- Raw Synced Intervals (${icuIntervals.length}) ---`))
      if (icuIntervals.length > 0) {
        const p = new Table({
          head: ['#', 'Start', 'End', 'Dur', 'Type', 'Watts', 'HR', 'Label'].map((h) =>
            chalk.cyan(h)
          )
        })

        icuIntervals.forEach((interval: any, index: number) => {
          p.push([
            index,
            interval.start_time,
            interval.end_time,
            interval.duration || interval.end_time - interval.start_time,
            interval.type || 'WORK',
            interval.average_watts || '-',
            interval.average_heartrate || '-',
            interval.label || '-'
          ])
        })
        console.log(p.toString())
      } else {
        console.log(chalk.gray('No synced intervals found in rawJson.'))
      }

      if (!workout.streams) {
        console.log(chalk.yellow('\n⚠️ No streams found in database for this workout.'))
        return
      }

      console.log(chalk.bold('\n--- Stream Data Audit ---'))
      const time = workout.streams.time as number[]
      const watts = workout.streams.watts as number[]
      const hr = workout.streams.heartrate as number[]
      const velocity = workout.streams.velocity as number[]

      console.log(`- Time stream: ${time?.length || 0} samples`)
      console.log(`- Watts stream: ${watts?.length || 0} samples`)
      console.log(`- HR stream: ${hr?.length || 0} samples`)
      console.log(`- Velocity stream: ${velocity?.length || 0} samples`)

      if (!time || time.length === 0) {
        console.error(chalk.red('Cannot detect intervals without time stream.'))
        return
      }

      const calculationFtp = workout.ftp || workout.user?.ftp || 250
      console.log(chalk.bold(`\n--- Engine Detection (FTP: ${calculationFtp}W) ---`))

      const plannedSteps = (workout.plannedWorkout?.structuredWorkout as any)?.steps || []
      let detected: any[] = []
      let metric = ''

      if (watts && watts.length > 0) {
        metric = 'power'
        detected = detectIntervals(time, watts, 'power', calculationFtp, plannedSteps)
      } else if (
        velocity &&
        velocity.length > 0 &&
        (workout.type === 'Run' || workout.type === 'Swim')
      ) {
        metric = 'pace'
        detected = detectIntervals(time, velocity, 'pace', undefined, plannedSteps)
      } else if (hr && hr.length > 0) {
        metric = 'heartrate'
        const maxHr = workout.maxHr || workout.user?.maxHr
        const threshold = maxHr ? maxHr * 0.7 : undefined
        detected = detectIntervals(time, hr, 'heartrate', threshold, plannedSteps)
      }

      console.log(`Detection Metric: ${chalk.cyan(metric || 'None')}`)
      console.log(`Intervals detected: ${chalk.green(detected.length)}`)

      if (detected.length > 0) {
        const p = new Table({
          head: ['#', 'Start', 'End', 'Dur', 'Type', 'Avg Val', 'Zone', 'Name', 'Match'].map((h) =>
            chalk.cyan(h)
          )
        })

        detected.forEach((interval: any, index: number) => {
          const avgVal =
            metric === 'power'
              ? interval.avg_power
              : metric === 'heartrate'
                ? interval.avg_heartrate
                : interval.avg_pace
          p.push([
            index,
            interval.start_time,
            interval.end_time,
            interval.duration,
            interval.type,
            Math.round(avgVal || 0),
            interval.intensity_zone || '-',
            interval.label || chalk.gray('-'),
            interval.match_score ? (interval.match_score * 100).toFixed(0) + '%' : chalk.gray('-')
          ])
        })
        console.log(p.toString())
      }

      // Peak Efforts
      console.log(chalk.bold('\n--- Peak Efforts ---'))
      if (watts && watts.length > 0) {
        const peaks = findPeakEfforts(time, watts, 'power')
        console.log(chalk.dim('Power Peaks:'))
        peaks.forEach((p) => console.log(`  ${p.duration_label}: ${Math.round(p.value)}W`))
      }

      // Advanced
      if (watts && hr && watts.length > 0 && hr.length > 0) {
        const decoupling = calculateAerobicDecoupling(time, watts, hr)
        console.log(
          `\nAerobic Decoupling: ${decoupling ? (decoupling * 100).toFixed(2) + '%' : 'N/A'}`
        )
      }

      if (hr && hr.length > 0) {
        const recovery = calculateHeartRateRecovery(time, hr)
        if (recovery) {
          console.log(`HR Recovery (1m): ${recovery.drop_1m} bpm`)
          console.log(`HR Recovery (2m): ${recovery.drop_2m} bpm`)
        }
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message)
      if (error.stack) console.error(error.stack)
    } finally {
      await prisma.$disconnect()
    }
  })

export default intervalsDebugCommand
