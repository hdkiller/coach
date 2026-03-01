import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { pbDetectionService } from '../../server/utils/services/pbDetectionService'

const pbCheckCommand = new Command('pb-check')

pbCheckCommand
  .description('Test Personal Best detection logic against a specific workout')
  .argument('[url]', 'Optional URL of the workout or workout ID')
  .option('--prod', 'Use production database')
  .option('--id <workoutId>', 'Filter by workout ID')
  .action(async (url, options) => {
    let workoutId = options.id
    let isProd = options.prod

    if (url) {
      const uuidMatch = url.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
      if (uuidMatch) {
        workoutId = uuidMatch[0]
      } else if (!workoutId) {
        workoutId = url
      }

      if (url.includes('coachwatts.com')) {
        isProd = true
        console.log(chalk.yellow('Detected coachwatts.com context. Forcing --prod mode.'))
      }
    }

    if (!workoutId) {
      console.error(chalk.red('Error: Workout ID is required.'))
      process.exit(1)
    }

    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL
    if (isProd) {
      process.env.DATABASE_URL = connectionString
      console.log(chalk.yellow('Using PRODUCTION database.'))
    }

    const { prisma } = await import('../../server/utils/db')

    try {
      console.log(chalk.gray(`Fetching workout ${workoutId}...`))

      const workout = await prisma.workout.findUnique({
        where: { id: workoutId },
        include: { user: true }
      })

      if (!workout) {
        console.error(chalk.red(`Workout not found: ${workoutId}`))
        process.exit(1)
      }

      console.log('')
      console.log(
        chalk.cyan(`=== Workout Information ===
Title:    ${workout.title}
Type:     ${workout.type}
Date:     ${workout.date.toISOString().split('T')[0]}
User:     ${workout.user?.name} (${workout.user?.email})
`)
      )

      console.log(chalk.gray('Running PB detection logic...'))

      const results = await pbDetectionService.detectPBs(workoutId, prisma)

      if (!results || results.length === 0) {
        console.log(chalk.yellow('No new Personal Bests detected for this workout.'))
        return
      }

      console.log('')
      console.log(chalk.bold.green('🏆 NEW PERSONAL BESTS DETECTED!'))

      results.forEach((pb) => {
        const isPace = pb.unit === 's'
        let displayValue = pb.value.toString()
        if (isPace) {
          const mins = Math.floor(pb.value / 60)
          const secs = Math.floor(pb.value % 60)
          displayValue = `${mins}:${secs.toString().padStart(2, '0')}`
        }

        console.log(
          chalk.white(
            `  • ${chalk.bold(pb.label)}: ${chalk.yellow(displayValue)}${isPace ? '' : pb.unit}`
          )
        )
      })
    } catch (e: any) {
      console.error('')
      console.error(chalk.red('Error during detection:'), e)
    } finally {
      const { prisma: db } = await import('../../server/utils/db')
      await db.$disconnect()
    }
  })

export default pbCheckCommand
