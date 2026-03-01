import { Command } from 'commander'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import chalk from 'chalk'

const streamCommand = new Command('stream')
  .description('Debug streams for a specific workout')
  .argument('<id>', 'Workout ID')
  .option('--prod', 'Use production database')
  .action(async (id, options) => {
    const isProd = options.prod
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      console.log(chalk.gray(`Fetching streams for workout ${id}...`))

      const streams = await prisma.workoutStream.findUnique({
        where: { workoutId: id }
      })

      if (!streams) {
        console.log(chalk.red('No streams found for this workout.'))
        return
      }

      console.log('')
      console.log(chalk.bold.cyan(`=== Stream Debug: ${id} ===`))

      const streamKeys = [
        'time',
        'distance',
        'velocity',
        'heartrate',
        'cadence',
        'watts',
        'altitude',
        'latlng',
        'grade',
        'moving',
        'surges'
      ]

      console.log('')
      console.log(
        chalk.bold(
          'Stream Name'.padEnd(20) + 'Length'.padEnd(10) + 'First Value'.padEnd(20) + 'Last Value'
        )
      )
      console.log(chalk.gray('-'.repeat(80)))

      for (const key of streamKeys) {
        const data = (streams as any)[key]
        if (data && Array.isArray(data)) {
          const first = JSON.stringify(data[0])
          const last = JSON.stringify(data[data.length - 1])
          console.log(
            `${key.padEnd(20)}${data.length.toString().padEnd(10)}${first.padEnd(20)}${last}`
          )
        } else if (data) {
          console.log(`${key.padEnd(20)}${chalk.yellow('Not an array')}`)
        } else {
          console.log(`${key.padEnd(20)}${chalk.gray('Missing')}`)
        }
      }

      // Also check time increments
      if (Array.isArray(streams.time) && streams.time.length > 1) {
        const time = streams.time as number[]
        const diffs = []
        for (let i = 1; i < Math.min(time.length, 10); i++) {
          diffs.push(time[i] - (time[i - 1] || 0))
        }
        console.log('')
        console.log(chalk.gray(`Sample time diffs: ${diffs.join(', ')}`))

        const lastDiff = time[time.length - 1] - (time[time.length - 2] || 0)
        console.log(chalk.gray(`Last time diff: ${lastDiff}`))
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error)
    } finally {
      await prisma.$disconnect()
    }
  })

export default streamCommand
