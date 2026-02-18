import { Command } from 'commander'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import chalk from 'chalk'

function toNumericArray(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * (sorted.length - 1))))
  return sorted[idx] ?? 0
}

const cadenceJitterCommand = new Command('cadence-jitter')
  .description('Analyze cadence jitter/spikes for a workout stream')
  .requiredOption('--id <workoutId>', 'Workout ID to inspect')
  .option('--prod', 'Use production database')
  .option('--jump-threshold <rpm>', 'Cadence jump threshold in RPM', '10')
  .option('--stable-watts-delta <watts>', 'Max watts delta considered "steady"', '12')
  .action(async (options) => {
    const isProd = Boolean(options.prod)
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

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      const workout = await prisma.workout.findUnique({
        where: { id: options.id },
        select: {
          id: true,
          date: true,
          title: true,
          source: true,
          type: true,
          averageCadence: true,
          averageWatts: true,
          averageHr: true
        }
      })

      if (!workout) {
        console.log(chalk.red(`Workout not found: ${options.id}`))
        process.exit(1)
      }

      const stream = await prisma.workoutStream.findUnique({
        where: { workoutId: options.id },
        select: { cadence: true, watts: true, time: true }
      })

      if (!stream) {
        console.log(chalk.red(`WorkoutStream not found for workout: ${options.id}`))
        process.exit(1)
      }

      const cadence = toNumericArray(stream.cadence)
      const watts = toNumericArray(stream.watts)
      const time = toNumericArray(stream.time)

      if (cadence.length < 2) {
        console.log(chalk.red('Cadence stream is missing or too short to analyze.'))
        process.exit(1)
      }

      const jumpThreshold = Number(options.jumpThreshold)
      const stableWattsDelta = Number(options.stableWattsDelta)
      const n = cadence.length

      let jumpCount = 0
      let strongJumpCount = 0
      let stablePowerJumpCount = 0
      let zeroCadenceCount = 0
      let lowCadenceCount = 0
      const deltas: number[] = []

      const pairs = Math.min(cadence.length, Math.max(0, watts.length))

      for (let i = 0; i < n; i++) {
        const c = cadence[i] ?? 0
        if (c === 0) zeroCadenceCount++
        if (c > 0 && c < 60) lowCadenceCount++

        if (i === 0) continue
        const prev = cadence[i - 1] ?? c
        const delta = Math.abs(c - prev)
        deltas.push(delta)

        if (delta >= jumpThreshold) jumpCount++
        if (delta >= jumpThreshold * 1.5) strongJumpCount++

        if (i < pairs) {
          const wp = watts[i - 1]
          const wc = watts[i]
          if (typeof wp === 'number' && typeof wc === 'number') {
            const wDelta = Math.abs(wc - wp)
            if (delta >= jumpThreshold && wDelta <= stableWattsDelta) {
              stablePowerJumpCount++
            }
          }
        }
      }

      const cadenceMin = Math.min(...cadence)
      const cadenceMax = Math.max(...cadence)
      const cadenceMean = mean(cadence)
      const deltaMean = mean(deltas)
      const p95Delta = percentile(deltas, 95)
      const jumpRate = deltas.length > 0 ? (jumpCount / deltas.length) * 100 : 0
      const stablePowerJumpRate =
        deltas.length > 0 ? (stablePowerJumpCount / deltas.length) * 100 : 0

      const likelyErratic = jumpRate >= 12 || stablePowerJumpRate >= 8 || p95Delta >= 12

      console.log(chalk.bold.cyan('\n=== Cadence Jitter Analysis ==='))
      console.log(`Workout: ${workout.title}`)
      console.log(`Workout ID: ${workout.id}`)
      console.log(`Date: ${workout.date.toISOString()}`)
      console.log(`Source/Type: ${workout.source} / ${workout.type || 'unknown'}`)
      console.log(
        `Summary Metrics: avgCadence=${workout.averageCadence ?? 'N/A'} avgWatts=${workout.averageWatts ?? 'N/A'} avgHr=${workout.averageHr ?? 'N/A'}`
      )

      console.log(chalk.bold('\nStream Stats'))
      console.log(`Cadence points: ${cadence.length}`)
      console.log(`Watts points: ${watts.length}`)
      console.log(`Time points: ${time.length}`)
      console.log(`Cadence range: ${cadenceMin.toFixed(1)} - ${cadenceMax.toFixed(1)} rpm`)
      console.log(`Cadence mean (stream): ${cadenceMean.toFixed(2)} rpm`)
      console.log(`Cadence delta mean: ${deltaMean.toFixed(2)} rpm/sample`)
      console.log(`Cadence delta p95: ${p95Delta.toFixed(2)} rpm/sample`)

      console.log(chalk.bold('\nJitter Signals'))
      console.log(`Jump threshold: >= ${jumpThreshold} rpm`)
      console.log(`Cadence jumps: ${jumpCount}/${deltas.length} (${jumpRate.toFixed(2)}%)`)
      console.log(`Strong jumps: ${strongJumpCount}`)
      console.log(
        `Jumps while watts steady (<= ${stableWattsDelta}W delta): ${stablePowerJumpCount}/${deltas.length} (${stablePowerJumpRate.toFixed(2)}%)`
      )
      console.log(`Zero cadence points: ${zeroCadenceCount}`)
      console.log(`Low cadence (1-59 rpm) points: ${lowCadenceCount}`)

      console.log(chalk.bold('\nConclusion'))
      if (likelyErratic) {
        console.log(chalk.red('Likely erratic cadence stream behavior detected.'))
      } else {
        console.log(
          chalk.green('No strong evidence of cadence jitter based on configured thresholds.')
        )
      }
    } catch (error: any) {
      console.error(chalk.red('Failed to analyze cadence jitter:'), error?.message || error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
    }
  })

export default cadenceJitterCommand
