import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { thresholdDetectionService } from '../../server/utils/services/thresholdDetectionService'

const thresholdCheckCommand = new Command('threshold-check')

thresholdCheckCommand
  .description('Test threshold detection logic against a specific workout')
  .argument('[url]', 'Optional URL of the workout or workout ID')
  .option('--prod', 'Use production database')
  .option('--id <workoutId>', 'Filter by workout ID')
  .option('--dry-run', 'Do not create real database recommendations/notifications', true)
  .option('--no-dry-run', 'Actually create recommendations/notifications')
  .action(async (url, options) => {
    let workoutId = options.id
    let isProd = options.prod

    if (url) {
      // Match UUID in URL or argument
      const uuidMatch = url.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
      if (uuidMatch) {
        workoutId = uuidMatch[0]
      } else if (!workoutId) {
        workoutId = url
      }

      if (url && url.includes('coachwatts.com')) {
        isProd = true
        console.log(chalk.yellow('Detected coachwatts.com context. Forcing --prod mode.'))
      }
    }

    if (!workoutId) {
      console.error(
        chalk.red('Error: Workout ID is required. Provide it as an argument or via --id.')
      )
      process.exit(1)
    }

    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (isProd) {
      if (!connectionString) {
        console.error(chalk.red('DATABASE_URL_PROD is not defined.'))
        process.exit(1)
      }
      process.env.DATABASE_URL = connectionString
      console.log(chalk.yellow('Using PRODUCTION database.'))
    } else {
      console.log(chalk.blue('Using DEVELOPMENT database.'))
    }

    const dryRun = options.dryRun !== false
    console.log(
      chalk.gray(
        `Mode: ${dryRun ? chalk.bold.green('DRY RUN') : chalk.bold.red('LIVE')} (Dry run is default, use --no-dry-run for live)`
      )
    )

    // Import prisma AFTER setting environment variable
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

      console.log(
        chalk.cyan(`
=== Workout Information ===
Title:    ${workout.title}
Type:     ${workout.type}
Date:     ${workout.date.toISOString().split('T')[0]}
Duration: ${Math.round(workout.durationSec / 60)} min (${workout.durationSec}s)
User:     ${workout.user?.name} (${workout.user?.email})
`)
      )

      console.log(chalk.gray('Running detection logic...'))

      const results = await thresholdDetectionService.detectThresholdIncreases(workoutId, {
        dryRun
      })

      if (!results) {
        console.log(chalk.yellow('Detection skipped or failed (no streams or user data).'))
        return
      }

      console.log(chalk.bold.cyan('\n=== Detection Results ==='))

      const durationMet = results.minDurationMet
      console.log(`Min Duration Met: ${durationMet ? chalk.green('YES') : chalk.red('NO')}`)

      // LTHR Result
      if (results.lthr) {
        const { old: oldHr, new: newHr, detected } = results.lthr
        const increase = detected
          ? chalk.bold.green('INCREASE DETECTED!')
          : chalk.gray('No increase')
        console.log(`\n${chalk.bold('Heart Rate (LTHR):')}`)
        console.log(`  Current LTHR: ${oldHr} bpm`)
        console.log(`  Peak 20m HR:  ${newHr} bpm`)
        console.log(`  Result:       ${increase}`)
        if (detected && !durationMet) {
          console.log(
            chalk.yellow(
              `  ⚠️  Peak HR is higher, but duration criteria not met for automatic trigger.`
            )
          )
        }
      } else {
        console.log(`\n${chalk.bold('Heart Rate (LTHR):')} No heart rate data or threshold found.`)
      }

      // FTP Result
      if (results.ftp) {
        const { old: oldFtp, new: newFtp, detected } = results.ftp
        const increase = detected
          ? chalk.bold.green('INCREASE DETECTED!')
          : chalk.gray('No increase')
        console.log(`\n${chalk.bold('Power (FTP):')}`)
        console.log(`  Current FTP:  ${oldFtp}W`)
        console.log(`  Peak 20m:     ${Math.round(newFtp / 0.95)}W (95% = ${newFtp}W)`)
        console.log(`  Result:       ${increase}`)
      } else {
        console.log(`\n${chalk.bold('Power (FTP):')} No power data or threshold found.`)
      }

      // Max HR Result
      if (results.maxHr) {
        const { old: oldMax, new: newMax, detected } = results.maxHr
        const increase = detected ? chalk.bold.green('NEW PEAK!') : chalk.gray('No change')
        console.log(`\n${chalk.bold('Max Heart Rate:')}`)
        console.log(`  Current Max:  ${oldMax} bpm`)
        console.log(`  Workout Max:  ${newMax} bpm`)
        console.log(`  Result:       ${increase}`)
      }

      // Threshold Pace Result
      if (results.thresholdPace) {
        const { old: oldPace, new: newPace, detected } = results.thresholdPace
        const increase = detected
          ? chalk.bold.green('IMPROVEMENT DETECTED!')
          : chalk.gray('No increase')
        const formatP = (s: number) =>
          `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}/km`
        console.log(`\n${chalk.bold('Threshold Pace:')}`)
        console.log(`  Current Pace: ${oldPace ? formatP(oldPace) : 'None'}`)
        console.log(`  Detected:     ${formatP(newPace)}`)
        console.log(`  Result:       ${increase}`)
      }

      if (
        !dryRun &&
        (results.lthr?.detected ||
          results.ftp?.detected ||
          results.maxHr?.detected ||
          results.thresholdPace?.detected)
      ) {
        console.log(chalk.green('\n✅ Recommendations and notifications created in database.'))
      } else if (!dryRun) {
        console.log(chalk.gray('\nNo increases detected, no database records created.'))
      } else if (results.lthr?.detected || results.ftp?.detected) {
        console.log(chalk.blue('\nℹ️ This was a dry run. No database changes were made.'))
      }
    } catch (e: any) {
      console.error(chalk.red('\nError during detection:'), e)
    } finally {
      await prisma.$disconnect()
    }
  })

export default thresholdCheckCommand
